import pool from "./db";
import { fetchStationData } from "./station";

/**
 * Fetch current conditions from the station and store in PostgreSQL.
 * Shared between the background worker and the POST /api/ingest endpoint.
 */
export async function ingestReading(): Promise<{ timestamp: Date }> {
  const reading = await fetchStationData();

  await pool.query(
    `INSERT INTO weather_readings
      (timestamp, outside_temp, feels_like, dew_point, humidity,
       wind_speed, wind_gust, wind_dir, barometer, rain, rain_rate,
       wind_chill, heat_index)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      reading.timestamp,
      reading.outside_temp,
      reading.feels_like,
      reading.dew_point,
      reading.humidity,
      reading.wind_speed,
      reading.wind_gust,
      reading.wind_dir,
      reading.barometer,
      reading.rain,
      reading.rain_rate,
      reading.wind_chill,
      reading.heat_index,
    ],
  );

  return { timestamp: reading.timestamp };
}
