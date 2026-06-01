import dgram from "node:dgram";
import http from "node:http";

const port = toInt(process.env.PORT, 8888);
const rainSize = toInt(process.env.SIM_RAIN_SIZE, 2);
const stationAltitudeM = toFloat(
  process.env.SIM_STATION_ALTITUDE ?? process.env.STATION_ALTITUDE,
  330,
);
const stationId = process.env.SIM_STATION_ID ?? "virtual-weatherlink";
const udpTargetHost = process.env.SIM_UDP_TARGET_HOST ?? "host.docker.internal";
const udpTargetPort = toInt(process.env.SIM_UDP_TARGET_PORT, 22222);
const broadcastIntervalMs = toInt(process.env.SIM_BROADCAST_INTERVAL_MS, 1000);
const scenario = process.env.SIM_SCENARIO ?? "variable";

const udpSocket = dgram.createSocket("udp4");

const state = {
  lastUpdateMs: Date.now(),
  rainDailyMm: 0,
  rainMonthlyMm: 42.4,
  rainYearlyMm: 318.8,
  dayKey: formatDayKey(new Date()),
  monthKey: formatMonthKey(new Date()),
  yearKey: String(new Date().getFullYear()),
};

let broadcastTimer = null;
let broadcastStopTimer = null;
let broadcastStopAtMs = 0;

function toInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toFloat(value, fallback) {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function cToF(value) {
  return round((value * 9) / 5 + 32, 1);
}

function kmhToMph(value) {
  return round(value / 1.60934, 1);
}

function mbarToInHg(value) {
  return round(value / 33.8639, 3);
}

function heatIndexC(tempC, humidity) {
  if (tempC < 27 || humidity < 40) {
    return tempC;
  }

  const tempF = (tempC * 9) / 5 + 32;
  const indexF =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * humidity -
    0.22475541 * tempF * humidity -
    0.00683783 * tempF * tempF -
    0.05481717 * humidity * humidity +
    0.00122874 * tempF * tempF * humidity +
    0.00085282 * tempF * humidity * humidity -
    0.00000199 * tempF * tempF * humidity * humidity;

  return round(((indexF - 32) * 5) / 9, 1);
}

function windChillC(tempC, windKmh) {
  if (tempC > 10 || windKmh <= 4.8) {
    return tempC;
  }

  return round(
    13.12 +
      0.6215 * tempC -
      11.37 * windKmh ** 0.16 +
      0.3965 * tempC * windKmh ** 0.16,
    1,
  );
}

function seaLevelToAbsoluteMbar(seaLevelMbar, tempC) {
  const exponent = Math.pow(
    1 -
      (0.0065 * stationAltitudeM) /
        (tempC + 0.0065 * stationAltitudeM + 273.15),
    -5.257,
  );
  return round(seaLevelMbar / exponent, 1);
}

function mmToCounts(mm) {
  if (mm <= 0) {
    return 0;
  }

  switch (rainSize) {
    case 1:
      return round(mm / 0.254, 2);
    case 2:
      return round(mm / 0.2, 2);
    case 3:
      return round(mm / 0.1, 2);
    case 4:
      return round(mm / 0.0254, 2);
    default:
      return round(mm / 0.2, 2);
  }
}

function formatDayKey(value) {
  return value.toISOString().slice(0, 10);
}

function formatMonthKey(value) {
  return value.toISOString().slice(0, 7);
}

function rainRateMmPerHour(nowMs) {
  const seconds = nowMs / 1000;
  const slowPulse = Math.max(0, Math.sin(seconds / 540));
  const fastPulse = Math.max(0, Math.sin(seconds / 90));

  if (scenario === "storm") {
    return round(3 + slowPulse * 6 + fastPulse * 4, 1);
  }

  if (scenario === "calm") {
    return round(Math.max(0, fastPulse - 0.96) * 1.2, 1);
  }

  return round(
    Math.max(0, slowPulse - 0.72) * 5 + Math.max(0, fastPulse - 0.94) * 1.5,
    1,
  );
}

function resetRainBuckets(now) {
  const nextDayKey = formatDayKey(now);
  const nextMonthKey = formatMonthKey(now);
  const nextYearKey = String(now.getFullYear());

  if (state.dayKey !== nextDayKey) {
    state.dayKey = nextDayKey;
    state.rainDailyMm = 0;
  }

  if (state.monthKey !== nextMonthKey) {
    state.monthKey = nextMonthKey;
    state.rainMonthlyMm = 0;
  }

  if (state.yearKey !== nextYearKey) {
    state.yearKey = nextYearKey;
    state.rainYearlyMm = 0;
  }
}

function updateRainState(nowMs) {
  const now = new Date(nowMs);
  resetRainBuckets(now);

  const elapsedHours = Math.max(nowMs - state.lastUpdateMs, 0) / 3_600_000;
  const previousRate = rainRateMmPerHour(state.lastUpdateMs);
  const currentRate = rainRateMmPerHour(nowMs);
  const rainIncrementMm = ((previousRate + currentRate) / 2) * elapsedHours;

  state.rainDailyMm = round(state.rainDailyMm + rainIncrementMm, 2);
  state.rainMonthlyMm = round(state.rainMonthlyMm + rainIncrementMm, 2);
  state.rainYearlyMm = round(state.rainYearlyMm + rainIncrementMm, 2);
  state.lastUpdateMs = nowMs;
}

function getSnapshot(nowMs = Date.now()) {
  updateRainState(nowMs);

  const now = new Date(nowMs);
  const seconds = nowMs / 1000;
  const hours = now.getHours() + now.getMinutes() / 60;
  const diurnal = Math.sin(((hours - 6) / 24) * Math.PI * 2);
  const tempWave = Math.sin(seconds / 1500);
  const rainRate = rainRateMmPerHour(nowMs);
  const rainCooling = rainRate > 0 ? rainRate * 0.18 : 0;
  const tempC = round(17 + diurnal * 7 + tempWave * 1.4 - rainCooling, 1);
  const humidity = Math.round(
    clamp(
      70 - diurnal * 20 + Math.cos(seconds / 700) * 7 + rainRate * 4,
      38,
      98,
    ),
  );
  const dewPointC = round(tempC - (100 - humidity) / 5, 1);
  const windSpeedKmh = round(
    6 + Math.abs(Math.sin(seconds / 160)) * 11 + rainRate * 0.7,
    1,
  );
  const windGustKmh = round(
    windSpeedKmh + 4 + Math.abs(Math.sin(seconds / 28)) * 8,
    1,
  );
  const windDir = Math.round((seconds * 2.7) % 360);
  const seaLevelPressure = round(
    1014.2 + Math.sin(seconds / 2200) * 3.8 - rainRate * 0.45,
    1,
  );
  const absolutePressure = seaLevelToAbsoluteMbar(seaLevelPressure, tempC);
  const heatIndex = heatIndexC(tempC, humidity);
  const windChill = windChillC(tempC, windSpeedKmh);
  const rainfallLast15MinMm = round(rainRate / 4, 2);
  const rainfallLast60MinMm = round(rainRate, 2);
  const rainfallLast24HrMm = round(
    Math.min(state.rainDailyMm, rainRate * 6 + 2),
    2,
  );

  return {
    now,
    timestamp: Math.floor(nowMs / 1000),
    tempC,
    humidity,
    dewPointC,
    heatIndex,
    windChill,
    windSpeedKmh,
    windGustKmh,
    windDir,
    seaLevelPressure,
    absolutePressure,
    rainRateMmH: rainRate,
    rainfallLast15MinMm,
    rainfallLast60MinMm,
    rainfallLast24HrMm,
    rainDailyMm: state.rainDailyMm,
    rainMonthlyMm: state.rainMonthlyMm,
    rainYearlyMm: state.rainYearlyMm,
  };
}

function buildCurrentConditions(snapshot) {
  return {
    data: {
      did: stationId,
      ts: snapshot.timestamp,
      conditions: [
        {
          data_structure_type: 1,
          temp: cToF(snapshot.tempC),
          hum: snapshot.humidity,
          dew_point: cToF(snapshot.dewPointC),
          heat_index: cToF(snapshot.heatIndex),
          wind_chill: cToF(snapshot.windChill),
          wind_speed_last: kmhToMph(snapshot.windSpeedKmh),
          wind_dir_last: snapshot.windDir,
          wind_speed_avg_last_10_min: kmhToMph(snapshot.windSpeedKmh),
          wind_speed_hi_last_10_min: kmhToMph(snapshot.windGustKmh),
          wind_dir_at_hi_speed_last_10_min: snapshot.windDir,
          rain_size: rainSize,
          rain_rate_last: mmToCounts(snapshot.rainRateMmH / 4),
          rainfall_last_15_min: mmToCounts(snapshot.rainfallLast15MinMm),
          rainfall_last_60_min: mmToCounts(snapshot.rainfallLast60MinMm),
          rainfall_last_24_hr: mmToCounts(snapshot.rainfallLast24HrMm),
          rainfall_daily: mmToCounts(snapshot.rainDailyMm),
          rainfall_monthly: mmToCounts(snapshot.rainMonthlyMm),
          rainfall_year: mmToCounts(snapshot.rainYearlyMm),
        },
        {
          data_structure_type: 3,
          bar_sea_level: mbarToInHg(snapshot.seaLevelPressure),
          bar_trend: round(Math.sin(snapshot.timestamp / 7200) * 0.02, 3),
          bar_absolute: mbarToInHg(snapshot.absolutePressure),
        },
      ],
    },
    error: null,
  };
}

function buildRealtimePacket(snapshot) {
  return {
    ts: snapshot.timestamp,
    conditions: [
      {
        data_structure_type: 1,
        rain_size: rainSize,
        wind_speed_last: kmhToMph(snapshot.windSpeedKmh),
        wind_dir_last: snapshot.windDir,
        wind_speed_hi_last_10_min: kmhToMph(snapshot.windGustKmh),
        rain_rate_last: mmToCounts(snapshot.rainRateMmH),
        rainfall_daily: mmToCounts(snapshot.rainDailyMm),
        rainfall_monthly: mmToCounts(snapshot.rainMonthlyMm),
        rainfall_year: mmToCounts(snapshot.rainYearlyMm),
      },
    ],
  };
}

function sendRealtimePacket() {
  const snapshot = getSnapshot();
  const packet = Buffer.from(JSON.stringify(buildRealtimePacket(snapshot)));

  udpSocket.send(packet, udpTargetPort, udpTargetHost, (error) => {
    if (error) {
      console.error("[virtual-station] UDP send failed:", error.message);
    }
  });
}

function stopBroadcast() {
  if (broadcastTimer) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
  }

  if (broadcastStopTimer) {
    clearTimeout(broadcastStopTimer);
    broadcastStopTimer = null;
  }

  broadcastStopAtMs = 0;
  console.log("[virtual-station] live broadcast stopped");
}

function startBroadcast(durationSeconds) {
  const safeDurationSeconds = clamp(durationSeconds || 300, 1, 3600);

  broadcastStopAtMs = Date.now() + safeDurationSeconds * 1000;

  if (!broadcastTimer) {
    broadcastTimer = setInterval(() => {
      if (Date.now() >= broadcastStopAtMs) {
        stopBroadcast();
        return;
      }

      sendRealtimePacket();
    }, broadcastIntervalMs);
  }

  if (broadcastStopTimer) {
    clearTimeout(broadcastStopTimer);
  }

  broadcastStopTimer = setTimeout(
    stopBroadcast,
    safeDurationSeconds * 1000 + 50,
  );
  sendRealtimePacket();

  console.log(
    `[virtual-station] live broadcast started for ${safeDurationSeconds}s -> ${udpTargetHost}:${udpTargetPort}`,
  );

  return safeDurationSeconds;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

const server = http.createServer((request, response) => {
  const method = request.method ?? "GET";
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );

  if (method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (url.pathname === "/health") {
    sendJson(response, 200, { ok: true, scenario, stationId });
    return;
  }

  if (url.pathname === "/v1/current_conditions") {
    sendJson(response, 200, buildCurrentConditions(getSnapshot()));
    return;
  }

  if (url.pathname === "/v1/real_time") {
    const duration = startBroadcast(
      toInt(url.searchParams.get("duration"), 300),
    );
    sendJson(response, 200, {
      error: null,
      data: {
        station_id: stationId,
        duration,
        udp_target_host: udpTargetHost,
        udp_target_port: udpTargetPort,
        interval_ms: broadcastIntervalMs,
      },
    });
    return;
  }

  sendJson(response, 404, {
    error: "Not found",
    endpoints: [
      "/health",
      "/v1/current_conditions",
      "/v1/real_time?duration=300",
    ],
  });
});

server.listen(port, () => {
  console.log(
    `[virtual-station] listening on :${port} with scenario=${scenario}, UDP target=${udpTargetHost}:${udpTargetPort}`,
  );
});

function shutdown() {
  stopBroadcast();
  udpSocket.close();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
