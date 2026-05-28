/**
 * Import historical WeeWX data from MariaDB into PostgreSQL.
 *
 * WeeWX stores readings in US units (usUnits=1):
 *   temperature: °F, wind: mph, barometer: inHg, rain: inches
 *
 * This script converts everything to metric before inserting.
 *
 * Usage:
 *   npx tsx lib/import-weewx.ts
 *
 * Env vars (all optional – defaults shown):
 *   MARIADB_HOST=127.0.0.1
 *   MARIADB_PORT=3306
 *   MARIADB_USER=weewx
 *   MARIADB_PASS=weewx
 *   MARIADB_DB=weewxdb
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/weather
 */

import { createConnection, type Connection } from "mysql2/promise";
import { Pool } from "pg";

// --- Unit conversions (US → metric) ---

function fToC(f: number | null): number | null {
  if (f == null) return null;
  return +((f - 32) * (5 / 9)).toFixed(2);
}

function mphToKmh(mph: number | null): number | null {
  if (mph == null) return null;
  return +(mph * 1.60934).toFixed(2);
}

function inHgToMbar(inHg: number | null): number | null {
  if (inHg == null) return null;
  return +(inHg * 33.8639).toFixed(2);
}

function inToMm(inches: number | null): number | null {
  if (inches == null) return null;
  return +(inches * 25.4).toFixed(2);
}

// --- Main ---

const BATCH_SIZE = 2000;

async function main() {
  const maria: Connection = await createConnection({
    host: process.env.MARIADB_HOST ?? "127.0.0.1",
    port: parseInt(process.env.MARIADB_PORT ?? "3306", 10),
    user: process.env.MARIADB_USER ?? "weewx",
    password: process.env.MARIADB_PASS ?? "weewx",
    database: process.env.MARIADB_DB ?? "weewxdb",
  });

  const pg = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/weather",
  });

  // Ensure the target table exists
  const schemaSQL = await import("fs").then((fs) =>
    fs.readFileSync(new URL("./schema.sql", import.meta.url), "utf-8"),
  );
  await pg.query(schemaSQL);

  // Count total rows to import (skip bogus timestamps before year 2001)
  const [[{ total }]] = (await maria.query(
    "SELECT COUNT(*) as total FROM archive WHERE dateTime > 1000000000",
  )) as [Array<{ total: number }>, unknown];
  console.log(`[import] Found ${total} WeeWX records to import`);

  let offset = 0;
  let inserted = 0;
  let skipped = 0;

  while (offset < total) {
    const [rows] = (await maria.query(
      `SELECT dateTime, outTemp, appTemp, dewpoint, outHumidity,
              windSpeed, windGust, windDir, barometer, rain, rainRate,
              windchill, heatindex
       FROM archive
       WHERE dateTime > 1000000000
       ORDER BY dateTime ASC
       LIMIT ? OFFSET ?`,
      [BATCH_SIZE, offset],
    )) as [Array<Record<string, number | null>>, unknown];

    if (rows.length === 0) break;

    // Build a multi-row INSERT with ON CONFLICT DO NOTHING to skip dupes
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIdx = 1;

    for (const row of rows) {
      const ts = new Date((row.dateTime as number) * 1000);
      const outsideTemp = fToC(row.outTemp as number | null);
      const feelsLike = fToC(row.appTemp as number | null);
      const dewPoint = fToC(row.dewpoint as number | null);
      const humidity = row.outHumidity as number | null;
      const windSpeed = mphToKmh(row.windSpeed as number | null);
      const windGust = mphToKmh(row.windGust as number | null);
      const windDir = row.windDir as number | null;
      const barometer = inHgToMbar(row.barometer as number | null);
      const rain = inToMm(row.rain as number | null);
      const rainRate = inToMm(row.rainRate as number | null);
      const windChill = fToC(row.windchill as number | null);
      const heatIndex = fToC(row.heatindex as number | null);

      const params: string[] = [];
      for (let i = 0; i < 13; i++) {
        params.push(`$${paramIdx++}`);
      }
      placeholders.push(`(${params.join(",")})`);
      values.push(
        ts,
        outsideTemp,
        feelsLike,
        dewPoint,
        humidity,
        windSpeed,
        windGust,
        windDir,
        barometer,
        rain,
        rainRate,
        windChill,
        heatIndex,
      );
    }

    const sql = `INSERT INTO weather_readings
      (timestamp, outside_temp, feels_like, dew_point, humidity,
       wind_speed, wind_gust, wind_dir, barometer, rain, rain_rate,
       wind_chill, heat_index)
     VALUES ${placeholders.join(",")}
     ON CONFLICT DO NOTHING`;

    const result = await pg.query(sql, values);
    const batchInserted = result.rowCount ?? 0;
    inserted += batchInserted;
    skipped += rows.length - batchInserted;
    offset += rows.length;

    process.stdout.write(
      `\r[import] ${offset}/${total} processed (${inserted} inserted, ${skipped} skipped)`,
    );
  }

  console.log(
    `\n[import] Done! ${inserted} rows inserted, ${skipped} duplicates skipped.`,
  );

  // Rebuild daily_records from the imported data
  console.log("[import] Rebuilding daily_records...");
  await pg.query(`
    INSERT INTO daily_records (date, high_temp, low_temp, avg_wind, high_wind, total_rain, high_rain_rate)
    SELECT
      timestamp::date as date,
      MAX(outside_temp) as high_temp,
      MIN(outside_temp) as low_temp,
      AVG(wind_speed) as avg_wind,
      MAX(wind_gust) as high_wind,
      SUM(rain) as total_rain,
      MAX(rain_rate) as high_rain_rate
    FROM weather_readings
    GROUP BY timestamp::date
    ON CONFLICT (date) DO UPDATE SET
      high_temp = EXCLUDED.high_temp,
      low_temp = EXCLUDED.low_temp,
      avg_wind = EXCLUDED.avg_wind,
      high_wind = EXCLUDED.high_wind,
      total_rain = EXCLUDED.total_rain,
      high_rain_rate = EXCLUDED.high_rain_rate
  `);
  console.log("[import] daily_records rebuilt.");

  await maria.end();
  await pg.end();
}

main().catch((err) => {
  console.error("[import] Fatal error:", err);
  process.exit(1);
});
