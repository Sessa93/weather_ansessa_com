import pool from "@/lib/db";
import { fetchStationData } from "@/lib/station";

function degToCompass(deg: number): string {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

function kmhToBeaufort(kmh: number): number {
  if (kmh < 1) return 0;
  if (kmh < 6) return 1;
  if (kmh < 12) return 2;
  if (kmh < 20) return 3;
  if (kmh < 29) return 4;
  if (kmh < 39) return 5;
  if (kmh < 50) return 6;
  if (kmh < 62) return 7;
  if (kmh < 75) return 8;
  if (kmh < 89) return 9;
  if (kmh < 103) return 10;
  if (kmh < 118) return 11;
  return 12;
}

function fmt(n: number | null | undefined, decimals = 1): string {
  if (n == null) return "0.0";
  return n.toFixed(decimals);
}

function fmtTime(ts: Date | string | null): string {
  if (!ts) return "00:00";
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Rome",
  });
}

function fmtDate(d: Date): string {
  return d
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      timeZone: "Europe/Rome",
    })
    .replace(/\//g, "/");
}

function fmtTimeHMS(d: Date): string {
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Rome",
  });
}

export async function GET() {
  // Fetch live station data
  let temp = 0,
    humidity = 0,
    dewPoint = 0,
    windSpeed = 0,
    windGust = 0;
  let windDir = 0,
    rainRate = 0,
    barometer = 0,
    windChill = 0,
    heatIndex = 0;
  let feelsLike = 0,
    rainDaily = 0,
    rainMonthly = 0,
    rainYearly = 0;
  let now = new Date();

  try {
    const live = await fetchStationData();
    if (live && live.outside_temp !== null) {
      now = live.timestamp;
      temp = live.outside_temp ?? 0;
      humidity = live.humidity ?? 0;
      dewPoint = live.dew_point ?? 0;
      windSpeed = live.wind_speed ?? 0;
      windGust = live.wind_gust ?? 0;
      windDir = live.wind_dir ?? 0;
      rainRate = live.rain_rate ?? 0;
      barometer = live.barometer ?? 0;
      windChill = live.wind_chill ?? 0;
      heatIndex = live.heat_index ?? 0;
      feelsLike = live.feels_like ?? temp;
      rainDaily = live.rain_daily ?? 0;
      rainMonthly = live.rain_monthly ?? 0;
      rainYearly = live.rain_yearly ?? 0;
    } else {
      // Treat null temperature as "no data" and trigger DB fallback
      throw new Error("Missing live sensor data");
    }
  } catch {
    // Fall back to latest DB row that has sensor data
    const { rows } = await pool.query(
      `SELECT * FROM weather_readings 
       WHERE outside_temp IS NOT NULL 
       ORDER BY timestamp DESC LIMIT 1`,
    );
    if (rows.length) {
      const r = rows[0];
      now = new Date(r.timestamp);
      temp = Number(r.outside_temp) || 0;
      humidity = Number(r.humidity) || 0;
      dewPoint = Number(r.dew_point) || 0;
      windSpeed = Number(r.wind_speed) || 0;
      windGust = Number(r.wind_gust) || 0;
      windDir = Number(r.wind_dir) || 0;
      rainRate = Number(r.rain_rate) || 0;
      barometer = Number(r.barometer) || 0;
      windChill = Number(r.wind_chill) || 0;
      heatIndex = Number(r.heat_index) || 0;
      feelsLike = temp;
    }
  }

  // Today's extremes from DB
  const { rows: todayRows } = await pool.query(`
    SELECT
      MAX(outside_temp) AS temp_high,
      MIN(outside_temp) AS temp_low,
      MAX(wind_speed) AS wind_high,
      MAX(wind_gust) AS gust_high,
      MAX(barometer) AS press_high,
      MIN(barometer) AS press_low,
      SUM(rain) AS rain_today,
      (SELECT timestamp FROM weather_readings WHERE timestamp::date = CURRENT_DATE AND outside_temp = MAX(wr.outside_temp) ORDER BY timestamp LIMIT 1) AS temp_high_time,
      (SELECT timestamp FROM weather_readings WHERE timestamp::date = CURRENT_DATE AND outside_temp = MIN(wr.outside_temp) ORDER BY timestamp LIMIT 1) AS temp_low_time,
      (SELECT timestamp FROM weather_readings WHERE timestamp::date = CURRENT_DATE AND wind_speed = MAX(wr.wind_speed) ORDER BY timestamp LIMIT 1) AS wind_high_time,
      (SELECT timestamp FROM weather_readings WHERE timestamp::date = CURRENT_DATE AND wind_gust = MAX(wr.wind_gust) ORDER BY timestamp LIMIT 1) AS gust_high_time,
      (SELECT timestamp FROM weather_readings WHERE timestamp::date = CURRENT_DATE AND barometer = MAX(wr.barometer) ORDER BY timestamp LIMIT 1) AS press_high_time,
      (SELECT timestamp FROM weather_readings WHERE timestamp::date = CURRENT_DATE AND barometer = MIN(wr.barometer) ORDER BY timestamp LIMIT 1) AS press_low_time
    FROM weather_readings wr
    WHERE timestamp::date = CURRENT_DATE
  `);
  const today = todayRows[0] ?? {};

  // Yesterday's rain
  const { rows: yesterdayRows } = await pool.query(`
    SELECT COALESCE(SUM(rain), 0) AS rain_yesterday
    FROM weather_readings
    WHERE timestamp::date = CURRENT_DATE - 1
  `);

  // Rain last hour
  const { rows: hourRows } = await pool.query(`
    SELECT COALESCE(SUM(rain), 0) AS rain_hour
    FROM weather_readings
    WHERE timestamp >= NOW() - INTERVAL '1 hour'
  `);

  // Pressure trend (last 3 hours, mbar/hr)
  const { rows: trendRows } = await pool.query(`
    SELECT
      (MAX(barometer) FILTER (WHERE timestamp >= NOW() - INTERVAL '10 minutes')
       - MAX(barometer) FILTER (WHERE timestamp BETWEEN NOW() - INTERVAL '3 hours' AND NOW() - INTERVAL '2 hours 50 minutes'))
      / 3.0 AS press_trend,
      (MAX(outside_temp) FILTER (WHERE timestamp >= NOW() - INTERVAL '10 minutes')
       - MAX(outside_temp) FILTER (WHERE timestamp BETWEEN NOW() - INTERVAL '3 hours' AND NOW() - INTERVAL '2 hours 50 minutes'))
      / 3.0 AS temp_trend
    FROM weather_readings
    WHERE timestamp >= NOW() - INTERVAL '3 hours'
  `);

  const pressTrend = Number(trendRows[0]?.press_trend) || 0;
  const tempTrend = Number(trendRows[0]?.temp_trend) || 0;
  const rainToday = Number(today.rain_today) || rainDaily;
  const rainYesterday = Number(yesterdayRows[0]?.rain_yesterday) || 0;
  const rainHour = Number(hourRows[0]?.rain_hour) || 0;

  // Daylight check (approximate for Jerago con Orago ~45.7°N)
  const hour = now.getHours();
  const isDaylight = hour >= 5 && hour <= 21 ? 1 : 0;

  // Humidex calculation
  const humidex = (() => {
    const e = 6.112 * Math.pow(10, (7.5 * dewPoint) / (237.7 + dewPoint));
    return +(temp + 0.5555 * (e - 10)).toFixed(1);
  })();

  // Cloud base (metres, approximation)
  const cloudBase = Math.round(((temp - dewPoint) / 2.5) * 304.8);

  // Build the 58 fields (+ field 59 feels like)
  const fields = [
    /* 1  */ fmtDate(now),
    /* 2  */ fmtTimeHMS(now),
    /* 3  */ fmt(temp),
    /* 4  */ fmt(humidity, 0),
    /* 5  */ fmt(dewPoint),
    /* 6  */ fmt(windSpeed),
    /* 7  */ fmt(windGust),
    /* 8  */ fmt(windDir, 0),
    /* 9  */ fmt(rainRate),
    /* 10 */ fmt(rainToday),
    /* 11 */ fmt(barometer),
    /* 12 */ degToCompass(windDir),
    /* 13 */ String(kmhToBeaufort(windSpeed)),
    /* 14 */ "km/h",
    /* 15 */ "C",
    /* 16 */ "hPa",
    /* 17 */ "mm",
    /* 18 */ "0.0", // wind run (not tracked)
    /* 19 */ (pressTrend >= 0 ? "+" : "") + fmt(pressTrend),
    /* 20 */ fmt(rainMonthly),
    /* 21 */ fmt(rainYearly),
    /* 22 */ fmt(rainYesterday),
    /* 23 */ "0.0", // inside temp (N/A)
    /* 24 */ "0", // inside humidity (N/A)
    /* 25 */ fmt(windChill),
    /* 26 */ (tempTrend >= 0 ? "+" : "") + fmt(tempTrend),
    /* 27 */ fmt(Number(today.temp_high) || temp),
    /* 28 */ fmtTime(today.temp_high_time),
    /* 29 */ fmt(Number(today.temp_low) || temp),
    /* 30 */ fmtTime(today.temp_low_time),
    /* 31 */ fmt(Number(today.wind_high) || 0),
    /* 32 */ fmtTime(today.wind_high_time),
    /* 33 */ fmt(Number(today.gust_high) || 0),
    /* 34 */ fmtTime(today.gust_high_time),
    /* 35 */ fmt(Number(today.press_high) || barometer),
    /* 36 */ fmtTime(today.press_high_time),
    /* 37 */ fmt(Number(today.press_low) || barometer),
    /* 38 */ fmtTime(today.press_low_time),
    /* 39 */ "1.0.0", // version
    /* 40 */ "1", // build
    /* 41 */ fmt(windGust), // 10-min high gust
    /* 42 */ fmt(heatIndex),
    /* 43 */ fmt(humidex),
    /* 44 */ "0", // UV (not available)
    /* 45 */ "0.0", // ET (not available)
    /* 46 */ "0", // solar radiation (not available)
    /* 47 */ fmt(windDir, 0), // 10-min avg bearing
    /* 48 */ fmt(rainHour),
    /* 49 */ "0", // forecast number
    /* 50 */ String(isDaylight),
    /* 51 */ "0", // sensor contact lost
    /* 52 */ degToCompass(windDir), // avg wind direction
    /* 53 */ String(cloudBase),
    /* 54 */ "m",
    /* 55 */ fmt(feelsLike), // apparent temp
    /* 56 */ "0.0", // sunshine hours (not available)
    /* 57 */ "0", // current theoretical max solar
    /* 58 */ String(isDaylight), // is sunny
    /* 59 */ fmt(feelsLike), // feels like
  ];

  return new Response(fields.join(" ") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
