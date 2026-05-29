import pool from "@/lib/db";
import { fetchStationData, type StationReading } from "@/lib/station";
import { NextResponse } from "next/server";

export async function GET() {
  // Try to fetch live data from the station first
  let live: StationReading | null = null;
  try {
    live = await fetchStationData();
    // If live data has no temperature, treat as missing and fall back to DB
    if (live && live.outside_temp === null) {
      live = null;
    }
  } catch {
    // Station unreachable – fall back to latest DB reading
  }

  // Get today's high/low from DB
  const todayStats = await pool.query(`
    SELECT
      MAX(outside_temp) as high,
      MIN(outside_temp) as low,
      SUM(rain) as rain_today
    FROM weather_readings
    WHERE timestamp::date = CURRENT_DATE
  `);
  const stats = todayStats.rows[0] ?? {};

  // If we got live data, use it; otherwise fall back to last DB row
  if (live) {
    const temp = live.outside_temp ?? 0;
    const humidity = live.humidity ?? 0;
    const rainRate = live.rain_rate ?? 0;

    return NextResponse.json({
      timestamp: live.timestamp,
      temp,
      feels_like: live.feels_like ?? temp,
      condition: getCondition(temp, humidity, rainRate),
      icon: getIcon(temp, humidity, rainRate),
      high: Math.max(stats.high ?? temp, temp),
      low: Math.min(stats.low ?? temp, temp),
      wind_speed: live.wind_speed ?? 0,
      wind_gust: live.wind_gust ?? 0,
      wind_dir: live.wind_dir ?? 0,
      barometer: live.barometer ?? 0,
      dew_point: live.dew_point ?? 0,
      humidity,
      rain_today: live.rain_daily,
      rain_rate: rainRate,
      sunrise: "5:41 AM",
      sunset: "9:03 PM",
      moon_phase: "Waxing Gibbous",
      moon_visible: 92,
    });
  }

  // Fallback: latest reading from DB that has sensor data
  const { rows } = await pool.query(
    `SELECT * FROM weather_readings 
     WHERE outside_temp IS NOT NULL 
     ORDER BY timestamp DESC LIMIT 1`,
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No readings available" },
      { status: 404 },
    );
  }

  const latest = rows[0];

  return NextResponse.json({
    timestamp: latest.timestamp,
    temp: latest.outside_temp,
    feels_like: latest.feels_like,
    condition: getCondition(
      latest.outside_temp,
      latest.humidity,
      latest.rain_rate,
    ),
    icon: getIcon(latest.outside_temp, latest.humidity, latest.rain_rate),
    high: stats.high ?? latest.outside_temp,
    low: stats.low ?? latest.outside_temp,
    wind_speed: latest.wind_speed,
    wind_gust: latest.wind_gust,
    wind_dir: latest.wind_dir,
    barometer: latest.barometer,
    dew_point: latest.dew_point,
    humidity: latest.humidity,
    rain_today: stats.rain_today ?? 0,
    rain_rate: latest.rain_rate,
    sunrise: "5:41 AM",
    sunset: "9:03 PM",
    moon_phase: "Waxing Gibbous",
    moon_visible: 92,
  });
}

function getCondition(
  temp: number,
  humidity: number,
  rainRate: number,
): string {
  if (rainRate > 0) return "Rain";
  if (humidity > 85) return "Mostly Cloudy";
  if (humidity > 70) return "Partly Cloudy";
  return "Mostly Clear";
}

function getIcon(temp: number, humidity: number, rainRate: number): string {
  if (rainRate > 0) return "rain";
  if (humidity > 85) return "mostly-cloudy-day";
  if (humidity > 70) return "partly-cloudy-day";
  return "mostly-clear-day";
}
