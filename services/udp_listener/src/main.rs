use std::env;
use std::net::UdpSocket;
use std::time::Duration;

use rumqttc::{Client, MqttOptions, QoS};
use serde::{Deserialize, Serialize};


const UDP_PORT: u16 = 22222;
const TOPIC: &str = "weather/live";

// ----- WLL UDP broadcast structs -----

#[derive(Deserialize)]
struct WllPacket {
    ts: u64,
    conditions: Vec<Condition>,
}

#[derive(Deserialize)]
struct Condition {
    data_structure_type: u8,
    #[serde(default)]
    rain_size: u8,
    wind_speed_last: Option<f64>,
    wind_dir_last: Option<f64>,
    wind_speed_hi_last_10_min: Option<f64>,
    rain_rate_last: Option<f64>,
    rainfall_daily: Option<f64>,
    rainfall_monthly: Option<f64>,
    rainfall_year: Option<f64>,
}

// ----- Published MQTT message -----

#[derive(Serialize)]
struct LiveReading {
    ts: u64,
    wind_speed: Option<f64>,
    wind_dir: Option<f64>,
    wind_gust: Option<f64>,
    /// mm/hr
    rain_rate: Option<f64>,
    /// mm
    rain_today: Option<f64>,
    /// mm
    rain_monthly: Option<f64>,
    /// mm
    rain_yearly: Option<f64>,
}

// ----- Unit conversions (same logic as lib/station.ts) -----

fn mph_to_kmh(v: Option<f64>) -> Option<f64> {
    v.map(|x| (x * 1.60934 * 10.0).round() / 10.0)
}

fn rain_mm(counts: Option<f64>, size: u8) -> Option<f64> {
    counts.map(|c| {
        let mm = match size {
            1 => c * 0.01 * 25.4,
            2 => c * 0.2,
            3 => c * 0.1,
            4 => c * 0.001 * 25.4,
            _ => c * 0.2,
        };
        (mm * 100.0).round() / 100.0
    })
}

// rate_last in the broadcast is counts/hr already
fn rain_rate_mmh(counts: Option<f64>, size: u8) -> Option<f64> {
    rain_mm(counts, size)
}

// ----- Main -----

fn main() {
    let mqtt_host = env::var("MQTT_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let mqtt_port: u16 = env::var("MQTT_PORT")
        .unwrap_or_else(|_| "1883".to_string())
        .parse()
        .unwrap_or(1883);

    // MQTT client (sync) – event loop must be drained in a background thread
    let mut opts = MqttOptions::new("wll-udp-listener", &mqtt_host, mqtt_port);
    opts.set_keep_alive(Duration::from_secs(30));
    let (client, mut conn) = Client::new(opts, 128);

    std::thread::spawn(move || {
        for event in conn.iter() {
            if let Err(e) = event {
                eprintln!("[mqtt] {e}");
            }
        }
    });

    // UDP socket
    let sock = UdpSocket::bind(("0.0.0.0", UDP_PORT))
        .unwrap_or_else(|e| panic!("failed to bind UDP port {UDP_PORT}: {e}"));
    sock.set_broadcast(true).expect("set_broadcast failed");
    println!("[udp] Listening on port {UDP_PORT}, publishing to MQTT {mqtt_host}:{mqtt_port}/{TOPIC}");

    let mut buf = [0u8; 4096];
    loop {
        let (len, addr) = match sock.recv_from(&mut buf) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("[udp] recv error: {e}");
                continue;
            }
        };

        let pkt: WllPacket = match serde_json::from_slice(&buf[..len]) {
            Ok(p) => p,
            Err(e) => {
                eprintln!("[parse] {e}: {}", String::from_utf8_lossy(&buf[..len]));
                continue;
            }
        };

        // ISS real-time data is data_structure_type = 1
        let Some(cond) = pkt.conditions.iter().find(|c| c.data_structure_type == 1) else {
            continue;
        };

        let rs = cond.rain_size;
        let reading = LiveReading {
            ts: pkt.ts,
            wind_speed: mph_to_kmh(cond.wind_speed_last),
            wind_dir: cond.wind_dir_last,
            wind_gust: mph_to_kmh(cond.wind_speed_hi_last_10_min),
            rain_rate: rain_rate_mmh(cond.rain_rate_last, rs),
            rain_today: rain_mm(cond.rainfall_daily, rs),
            rain_monthly: rain_mm(cond.rainfall_monthly, rs),
            rain_yearly: rain_mm(cond.rainfall_year, rs),
        };

        let json = match serde_json::to_vec(&reading) {
            Ok(j) => j,
            Err(e) => {
                eprintln!("[serialize] {e}");
                continue;
            }
        };

        println!("[{addr}] ts={} → {TOPIC}", pkt.ts);

        if let Err(e) = client.publish(TOPIC, QoS::AtMostOnce, false, json) {
            eprintln!("[mqtt] publish failed: {e}");
        }
    }
}
