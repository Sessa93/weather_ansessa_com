/**
 * Seed script – populates the weather database with sample data.
 *
 * Usage:
 *   npx tsx lib/seed.ts
 *
 * Requires DATABASE_URL env var (reads .env.local automatically via dotenv).
 */

import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/weather";

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_readings (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        outside_temp REAL, feels_like REAL, dew_point REAL,
        humidity REAL, wind_speed REAL, wind_gust REAL, wind_dir REAL,
        barometer REAL, rain REAL, rain_rate REAL,
        wind_chill REAL, heat_index REAL
      );
      CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON weather_readings (timestamp DESC);

      CREATE TABLE IF NOT EXISTS daily_records (
        date DATE PRIMARY KEY,
        high_temp REAL, low_temp REAL, avg_wind REAL,
        high_wind REAL, total_rain REAL, high_rain_rate REAL
      );
    `);

    // Seed 48 hours of readings (every 5 minutes)
    const now = new Date();
    const values: string[] = [];
    for (let i = 48 * 12; i >= 0; i--) {
      const ts = new Date(now.getTime() - i * 5 * 60 * 1000);
      const hour = ts.getHours();
      // Simulate daily temp cycle
      const baseTemp = 20 + 8 * Math.sin(((hour - 6) / 24) * Math.PI * 2);
      const temp = +(baseTemp + (Math.random() - 0.5) * 2).toFixed(1);
      const humidity = +(60 + Math.random() * 20).toFixed(0);
      const dewPoint = +(temp - (100 - humidity) / 5).toFixed(1);
      const windSpeed = +(Math.random() * 15).toFixed(1);
      const windGust = +(windSpeed + Math.random() * 8).toFixed(1);
      const windDir = +(Math.random() * 360).toFixed(0);
      const barometer = +(1013 + Math.random() * 10).toFixed(1);
      const rain = Math.random() > 0.9 ? +(Math.random() * 2).toFixed(1) : 0;
      const rainRate = rain > 0 ? +(rain * 6).toFixed(1) : 0;
      const feelsLike = +(temp + (humidity > 70 ? 2 : -1)).toFixed(1);
      const windChill = +(temp - windSpeed * 0.3).toFixed(1);
      const heatIndex = +(
        temp + (humidity > 60 ? (humidity - 60) * 0.1 : 0)
      ).toFixed(1);

      values.push(
        `('${ts.toISOString()}', ${temp}, ${feelsLike}, ${dewPoint}, ${humidity}, ${windSpeed}, ${windGust}, ${windDir}, ${barometer}, ${rain}, ${rainRate}, ${windChill}, ${heatIndex})`,
      );
    }

    await client.query(`
      INSERT INTO weather_readings
        (timestamp, outside_temp, feels_like, dew_point, humidity, wind_speed, wind_gust, wind_dir, barometer, rain, rain_rate, wind_chill, heat_index)
      VALUES ${values.join(",\n")}
      ON CONFLICT DO NOTHING
    `);

    // Seed daily records for last 30 days
    const dailyValues: string[] = [];
    for (let d = 30; d >= 0; d--) {
      const date = new Date(now.getTime() - d * 86400000);
      const dateStr = date.toISOString().split("T")[0];
      const highTemp = +(22 + Math.random() * 12).toFixed(1);
      const lowTemp = +(10 + Math.random() * 8).toFixed(1);
      dailyValues.push(
        `('${dateStr}', ${highTemp}, ${lowTemp}, ${+(Math.random() * 10).toFixed(1)}, ${+(Math.random() * 30).toFixed(1)}, ${+(Math.random() * 20).toFixed(1)}, ${+(Math.random() * 50).toFixed(1)})`,
      );
    }

    await client.query(`
      INSERT INTO daily_records (date, high_temp, low_temp, avg_wind, high_wind, total_rain, high_rain_rate)
      VALUES ${dailyValues.join(",\n")}
      ON CONFLICT (date) DO NOTHING
    `);

    console.log("Seed complete!");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
