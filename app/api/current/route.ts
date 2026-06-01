import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const [latestRes, statsRes] = await Promise.all([
    pool.query(
      `SELECT * FROM weather_readings
       WHERE outside_temp IS NOT NULL
       ORDER BY timestamp DESC LIMIT 1`,
    ),
    pool.query(`
      WITH today AS (
        SELECT timestamp, outside_temp, rain
        FROM weather_readings
        WHERE timestamp::date = CURRENT_DATE
      )
      SELECT
        MAX(outside_temp) AS high,
        MIN(outside_temp) AS low,
        SUM(rain) AS rain_today,
        (
          SELECT timestamp
          FROM today
          WHERE outside_temp IS NOT NULL
          ORDER BY outside_temp DESC NULLS LAST, timestamp ASC
          LIMIT 1
        ) AS high_recorded_at,
        (
          SELECT timestamp
          FROM today
          WHERE outside_temp IS NOT NULL
          ORDER BY outside_temp ASC NULLS LAST, timestamp ASC
          LIMIT 1
        ) AS low_recorded_at
      FROM today
    `),
  ]);

  if (latestRes.rows.length === 0) {
    return NextResponse.json(
      { error: "No readings available" },
      { status: 404 },
    );
  }

  const row = latestRes.rows[0];
  const stats = statsRes.rows[0] ?? {};
  const temp = row.outside_temp ?? 0;
  const humidity = row.humidity ?? 0;
  const rainRate = row.rain_rate ?? 0;

  return NextResponse.json({
    timestamp: row.timestamp,
    temp,
    feels_like: row.feels_like ?? temp,
    condition: getCondition(temp, humidity, rainRate),
    icon: getIcon(temp, humidity, rainRate),
    high: stats.high ?? temp,
    high_recorded_at: stats.high_recorded_at ?? row.timestamp,
    low: stats.low ?? temp,
    low_recorded_at: stats.low_recorded_at ?? row.timestamp,
    wind_speed: row.wind_speed,
    wind_gust: row.wind_gust,
    wind_dir: row.wind_dir,
    barometer: row.barometer,
    dew_point: row.dew_point,
    humidity,
    rain_today: stats.rain_today ?? 0,
    rain_rate: rainRate,
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
