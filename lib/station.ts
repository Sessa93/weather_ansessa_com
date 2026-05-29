/**
 * Fetches current conditions from the Davis WeatherLink-compatible station
 * and converts imperial units to metric.
 */

// --- Unit conversion helpers ---

function fToC(f: number | null): number | null {
  if (f == null) return null;
  return +((f - 32) * (5 / 9)).toFixed(1);
}

function mphToKmh(mph: number | null): number | null {
  if (mph == null) return null;
  return +(mph * 1.60934).toFixed(1);
}

function inHgToMbar(inHg: number | null): number | null {
  if (inHg == null) return null;
  return +(inHg * 33.8639).toFixed(1);
}

/** Station altitude in metres (Jerago con Orago, ~330m) */
const STATION_ALTITUDE_M = parseFloat(process.env.STATION_ALTITUDE || "330");

/**
 * Reduce station (absolute) pressure to sea-level pressure using
 * the hypsometric formula with temperature compensation.
 * This matches what WeeWX does (same as DWD / NOAA standard).
 *
 * @param absInHg  absolute station pressure in inHg
 * @param tempF    current outside temperature in °F
 * @returns        sea-level pressure in mbar (hPa)
 */
function stationToSLP(
  absInHg: number | null,
  tempF: number | null,
): number | null {
  if (absInHg == null) return null;
  const P = absInHg * 33.8639; // station pressure in mbar
  const T = tempF != null ? (tempF - 32) * (5 / 9) : 15; // °C, default 15°C
  const h = STATION_ALTITUDE_M;
  // Hypsometric: SLP = P × (1 − 0.0065·h / (T + 0.0065·h + 273.15))^(−5.257)
  const slp =
    P * Math.pow(1 - (0.0065 * h) / (T + 0.0065 * h + 273.15), -5.257);
  return +slp.toFixed(1);
}

/**
 * Convert rain count to mm.
 * rain_size: 1 = 0.01 in, 2 = 0.2 mm, 3 = 0.1 mm, 4 = 0.001 in
 */
function rainCountToMm(count: number | null, rainSize: number): number {
  if (count == null || count === 0) return 0;
  switch (rainSize) {
    case 1:
      return +(count * 0.01 * 25.4).toFixed(2); // 0.01 in → mm
    case 2:
      return +(count * 0.2).toFixed(2); // 0.2 mm
    case 3:
      return +(count * 0.1).toFixed(2); // 0.1 mm
    case 4:
      return +(count * 0.001 * 25.4).toFixed(2); // 0.001 in → mm
    default:
      return +(count * 0.2).toFixed(2);
  }
}

// --- Types for the raw station response ---

interface StationOutdoor {
  data_structure_type: 1;
  temp: number | null;
  hum: number | null;
  dew_point: number | null;
  heat_index: number | null;
  wind_chill: number | null;
  wind_speed_last: number | null;
  wind_dir_last: number | null;
  wind_speed_avg_last_10_min: number | null;
  wind_speed_hi_last_10_min: number | null;
  wind_dir_at_hi_speed_last_10_min: number | null;
  rain_size: number;
  rain_rate_last: number | null;
  rain_rate_hi: number | null;
  rainfall_last_15_min: number | null;
  rainfall_last_60_min: number | null;
  rainfall_last_24_hr: number | null;
  rainfall_daily: number | null;
  rainfall_monthly: number | null;
  rainfall_year: number | null;
  rx_state: number | null;
  [key: string]: unknown;
}

interface StationBarometer {
  data_structure_type: 3;
  bar_sea_level: number | null;
  bar_trend: number | null;
  bar_absolute: number | null;
  [key: string]: unknown;
}

interface StationResponse {
  data: {
    did: string;
    ts: number;
    conditions: Array<
      StationOutdoor | StationBarometer | Record<string, unknown>
    >;
  };
  error: string | null;
}

// --- Parsed metric result ---

export interface StationReading {
  timestamp: Date;
  outside_temp: number | null;
  feels_like: number | null;
  dew_point: number | null;
  humidity: number | null;
  wind_speed: number | null;
  wind_gust: number | null;
  wind_dir: number | null;
  barometer: number | null;
  rain: number;
  rain_rate: number;
  wind_chill: number | null;
  heat_index: number | null;
  rain_daily: number;
  rain_monthly: number;
  rain_yearly: number;
  rx_state: number | null;
}

export async function fetchStationData(): Promise<StationReading> {
  const url = process.env.STATION_URL;
  if (!url) {
    throw new Error("STATION_URL environment variable is not set");
  }

  const res = await fetch(`${url}/v1/current_conditions`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Station responded with ${res.status}`);
  }

  const body: StationResponse = await res.json();

  if (body.error) {
    throw new Error(`Station error: ${body.error}`);
  }

  // Find the outdoor (type 1) and barometer (type 3) conditions
  const outdoor = body.data.conditions.find(
    (c): c is StationOutdoor => c.data_structure_type === 1,
  );
  const baro = body.data.conditions.find(
    (c): c is StationBarometer => c.data_structure_type === 3,
  );

  if (!outdoor) {
    throw new Error("No outdoor conditions found in station response");
  }

  const rainSize = outdoor.rain_size ?? 2;

  return {
    timestamp: new Date(body.data.ts * 1000),
    outside_temp: fToC(outdoor.temp),
    feels_like: fToC(outdoor.heat_index ?? outdoor.wind_chill ?? outdoor.temp),
    dew_point: fToC(outdoor.dew_point),
    humidity: outdoor.hum,
    wind_speed: mphToKmh(
      outdoor.wind_speed_avg_last_10_min ?? outdoor.wind_speed_last,
    ),
    wind_gust: mphToKmh(
      outdoor.wind_speed_hi_last_10_min ?? outdoor.wind_speed_last,
    ),
    wind_dir: outdoor.wind_dir_last,
    barometer: stationToSLP(baro?.bar_absolute ?? null, outdoor.temp),
    rain: rainCountToMm(outdoor.rainfall_last_15_min, rainSize),
    rain_rate: rainCountToMm(outdoor.rain_rate_last, rainSize) * 4, // 15-min rate → hourly
    wind_chill: fToC(outdoor.wind_chill),
    heat_index: fToC(outdoor.heat_index),
    rain_daily: rainCountToMm(outdoor.rainfall_daily, rainSize),
    rain_monthly: rainCountToMm(outdoor.rainfall_monthly, rainSize),
    rain_yearly: rainCountToMm(outdoor.rainfall_year, rainSize),
    rx_state: outdoor.rx_state ?? null,
  };
}
