import pool from "@/lib/db";
import { NextResponse } from "next/server";

async function getSnapshot(whereClause: string) {
  const { rows } = await pool.query(`
    WITH period AS (
      SELECT
        timestamp,
        outside_temp,
        wind_speed,
        wind_gust,
        rain,
        rain_rate,
        humidity,
        barometer
      FROM weather_readings
      WHERE ${whereClause}
    )
    SELECT
      MAX(outside_temp) AS high_temp,
      (
        SELECT timestamp
        FROM period
        WHERE outside_temp IS NOT NULL
        ORDER BY outside_temp DESC NULLS LAST, timestamp ASC
        LIMIT 1
      ) AS high_temp_recorded_at,
      MIN(outside_temp) AS low_temp,
      (
        SELECT timestamp
        FROM period
        WHERE outside_temp IS NOT NULL
        ORDER BY outside_temp ASC NULLS LAST, timestamp ASC
        LIMIT 1
      ) AS low_temp_recorded_at,
      ROUND(AVG(wind_speed)::numeric, 1) AS avg_wind,
      MAX(wind_gust) AS high_wind,
      (
        SELECT timestamp
        FROM period
        WHERE wind_gust IS NOT NULL
        ORDER BY wind_gust DESC NULLS LAST, timestamp ASC
        LIMIT 1
      ) AS high_wind_recorded_at,
      SUM(rain) AS total_rain,
      MAX(rain_rate) AS high_rain_rate,
      (
        SELECT timestamp
        FROM period
        WHERE rain_rate IS NOT NULL
        ORDER BY rain_rate DESC NULLS LAST, timestamp ASC
        LIMIT 1
      ) AS high_rain_rate_recorded_at,
      MAX(humidity) AS high_humidity,
      (
        SELECT timestamp
        FROM period
        WHERE humidity IS NOT NULL
        ORDER BY humidity DESC NULLS LAST, timestamp ASC
        LIMIT 1
      ) AS high_humidity_recorded_at,
      MIN(humidity) AS low_humidity,
      (
        SELECT timestamp
        FROM period
        WHERE humidity IS NOT NULL
        ORDER BY humidity ASC NULLS LAST, timestamp ASC
        LIMIT 1
      ) AS low_humidity_recorded_at,
      MAX(barometer) AS high_barometer,
      (
        SELECT timestamp
        FROM period
        WHERE barometer IS NOT NULL
        ORDER BY barometer DESC NULLS LAST, timestamp ASC
        LIMIT 1
      ) AS high_barometer_recorded_at,
      MIN(barometer) AS low_barometer,
      (
        SELECT timestamp
        FROM period
        WHERE barometer IS NOT NULL
        ORDER BY barometer ASC NULLS LAST, timestamp ASC
        LIMIT 1
      ) AS low_barometer_recorded_at
    FROM period
  `);

  return rows[0];
}

const TZ = process.env.TZ ?? "Europe/Rome";

export async function GET() {
  const [today, month, year, allTimeResult, monthlyRain] = await Promise.all([
    getSnapshot(`(timestamp AT TIME ZONE '${TZ}')::date = (NOW() AT TIME ZONE '${TZ}')::date`),
    getSnapshot(`timestamp >= DATE_TRUNC('month', NOW() AT TIME ZONE '${TZ}') AT TIME ZONE '${TZ}'`),
    getSnapshot(`timestamp >= DATE_TRUNC('year', NOW() AT TIME ZONE '${TZ}') AT TIME ZONE '${TZ}'`),
    pool.query(`
    SELECT
      'highest_temp' as key, MAX(outside_temp) as value,
      (
        SELECT timestamp
        FROM weather_readings
        ORDER BY outside_temp DESC NULLS LAST, timestamp ASC
        LIMIT 1
      ) as recorded_at
    FROM weather_readings
    UNION ALL
    SELECT
      'lowest_temp', MIN(outside_temp),
      (
        SELECT timestamp
        FROM weather_readings
        ORDER BY outside_temp ASC NULLS LAST, timestamp ASC
        LIMIT 1
      )
    FROM weather_readings
    UNION ALL
    SELECT
      'highest_wind', MAX(wind_gust),
      (
        SELECT timestamp
        FROM weather_readings
        ORDER BY wind_gust DESC NULLS LAST, timestamp ASC
        LIMIT 1
      )
    FROM weather_readings
    UNION ALL
    SELECT
      'highest_rain_rate', MAX(rain_rate),
      (
        SELECT timestamp
        FROM weather_readings
        ORDER BY rain_rate DESC NULLS LAST, timestamp ASC
        LIMIT 1
      )
    FROM weather_readings
    UNION ALL
    SELECT
      'highest_barometer', MAX(barometer),
      (
        SELECT timestamp
        FROM weather_readings
        ORDER BY barometer DESC NULLS LAST, timestamp ASC
        LIMIT 1
      )
    FROM weather_readings
    UNION ALL
    SELECT
      'lowest_barometer', MIN(barometer),
      (
        SELECT timestamp
        FROM weather_readings
        ORDER BY barometer ASC NULLS LAST, timestamp ASC
        LIMIT 1
      )
    FROM weather_readings
    UNION ALL
    SELECT
      'highest_humidity', MAX(humidity),
      (
        SELECT timestamp
        FROM weather_readings
        ORDER BY humidity DESC NULLS LAST, timestamp ASC
        LIMIT 1
      )
    FROM weather_readings
    UNION ALL
    SELECT
      'lowest_humidity', MIN(humidity),
      (
        SELECT timestamp
        FROM weather_readings
        ORDER BY humidity ASC NULLS LAST, timestamp ASC
        LIMIT 1
      )
    FROM weather_readings
  `),
    pool.query(`
      SELECT
        DATE_TRUNC('month', timestamp) as month,
        SUM(rain) as total_rain
      FROM weather_readings
      WHERE timestamp >= DATE_TRUNC('year', NOW() AT TIME ZONE '${TZ}') AT TIME ZONE '${TZ}'
      GROUP BY DATE_TRUNC('month', timestamp)
      ORDER BY month ASC
    `),
  ]);

  const allTime: Record<string, { value: number; recorded_at: string }> = {};
  for (const row of allTimeResult.rows) {
    allTime[row.key] = { value: row.value, recorded_at: row.recorded_at };
  }

  return NextResponse.json({
    today,
    month,
    year,
    allTime,
    monthlyRain: monthlyRain.rows,
  });
}
