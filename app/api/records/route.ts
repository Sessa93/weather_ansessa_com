import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  // Today's records
  const todayResult = await pool.query(`
    SELECT
      MAX(outside_temp) as high_temp,
      MIN(outside_temp) as low_temp,
      ROUND(AVG(wind_speed)::numeric, 1) as avg_wind,
      MAX(wind_gust) as high_wind,
      SUM(rain) as total_rain,
      MAX(rain_rate) as high_rain_rate
    FROM weather_readings
    WHERE timestamp::date = CURRENT_DATE
  `);

  // This month's records
  const monthResult = await pool.query(`
    SELECT
      MAX(outside_temp) as high_temp,
      MIN(outside_temp) as low_temp,
      ROUND(AVG(wind_speed)::numeric, 1) as avg_wind,
      MAX(wind_gust) as high_wind,
      SUM(rain) as total_rain,
      MAX(rain_rate) as high_rain_rate
    FROM weather_readings
    WHERE timestamp >= DATE_TRUNC('month', CURRENT_DATE)
  `);

  // This year records
  const yearResult = await pool.query(`
    SELECT
      MAX(outside_temp) as high_temp,
      MIN(outside_temp) as low_temp,
      ROUND(AVG(wind_speed)::numeric, 1) as avg_wind,
      MAX(wind_gust) as high_wind,
      SUM(rain) as total_rain,
      MAX(rain_rate) as high_rain_rate
    FROM weather_readings
    WHERE timestamp >= DATE_TRUNC('year', CURRENT_DATE)
  `);

  // All-time records with dates
  const allTimeResult = await pool.query(`
    SELECT
      'highest_temp' as key, MAX(outside_temp) as value,
      (SELECT timestamp FROM weather_readings ORDER BY outside_temp DESC NULLS LAST LIMIT 1) as recorded_at
    FROM weather_readings
    UNION ALL
    SELECT
      'lowest_temp', MIN(outside_temp),
      (SELECT timestamp FROM weather_readings ORDER BY outside_temp ASC NULLS LAST LIMIT 1)
    FROM weather_readings
    UNION ALL
    SELECT
      'highest_wind', MAX(wind_gust),
      (SELECT timestamp FROM weather_readings ORDER BY wind_gust DESC NULLS LAST LIMIT 1)
    FROM weather_readings
    UNION ALL
    SELECT
      'highest_rain_rate', MAX(rain_rate),
      (SELECT timestamp FROM weather_readings ORDER BY rain_rate DESC NULLS LAST LIMIT 1)
    FROM weather_readings
    UNION ALL
    SELECT
      'highest_barometer', MAX(barometer),
      (SELECT timestamp FROM weather_readings ORDER BY barometer DESC NULLS LAST LIMIT 1)
    FROM weather_readings
    UNION ALL
    SELECT
      'lowest_barometer', MIN(barometer),
      (SELECT timestamp FROM weather_readings ORDER BY barometer ASC NULLS LAST LIMIT 1)
    FROM weather_readings
    UNION ALL
    SELECT
      'highest_humidity', MAX(humidity),
      (SELECT timestamp FROM weather_readings ORDER BY humidity DESC NULLS LAST LIMIT 1)
    FROM weather_readings
    UNION ALL
    SELECT
      'lowest_humidity', MIN(humidity),
      (SELECT timestamp FROM weather_readings ORDER BY humidity ASC NULLS LAST LIMIT 1)
    FROM weather_readings
  `);

  const allTime: Record<string, { value: number; recorded_at: string }> = {};
  for (const row of allTimeResult.rows) {
    allTime[row.key] = { value: row.value, recorded_at: row.recorded_at };
  }

  // Monthly rain totals
  const monthlyRain = await pool.query(`
    SELECT
      DATE_TRUNC('month', timestamp) as month,
      SUM(rain) as total_rain
    FROM weather_readings
    WHERE timestamp >= DATE_TRUNC('year', CURRENT_DATE)
    GROUP BY DATE_TRUNC('month', timestamp)
    ORDER BY month ASC
  `);

  return NextResponse.json({
    today: todayResult.rows[0],
    month: monthResult.rows[0],
    year: yearResult.rows[0],
    allTime,
    monthlyRain: monthlyRain.rows,
  });
}
