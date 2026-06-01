import pool from "@/lib/db";
import { NextResponse } from "next/server";

interface Alert {
  type: "warning" | "danger";
  key: string;
  message_en: string;
  message_it: string;
}

export async function GET() {
  const { rows } = await pool.query(
    `SELECT outside_temp, wind_speed, wind_gust, rain_rate, humidity, barometer
     FROM weather_readings
     WHERE outside_temp IS NOT NULL
     ORDER BY timestamp DESC LIMIT 1`,
  );

  if (rows.length === 0) {
    return NextResponse.json([]);
  }

  const row = rows[0];
  const alerts: Alert[] = [];

  // High temperature
  if (row.outside_temp !== null && row.outside_temp >= 35) {
    alerts.push({
      type: "danger",
      key: "heat",
      message_en: `Extreme heat: ${row.outside_temp.toFixed(1)}°C`,
      message_it: `Caldo estremo: ${row.outside_temp.toFixed(1)}°C`,
    });
  } else if (row.outside_temp !== null && row.outside_temp >= 32) {
    alerts.push({
      type: "warning",
      key: "heat",
      message_en: `High temperature: ${row.outside_temp.toFixed(1)}°C`,
      message_it: `Temperatura alta: ${row.outside_temp.toFixed(1)}°C`,
    });
  }

  // Freezing
  if (row.outside_temp !== null && row.outside_temp <= 0) {
    alerts.push({
      type: row.outside_temp <= -5 ? "danger" : "warning",
      key: "freeze",
      message_en: `Freezing: ${row.outside_temp.toFixed(1)}°C`,
      message_it: `Gelo: ${row.outside_temp.toFixed(1)}°C`,
    });
  }

  // High wind
  if (row.wind_gust !== null && row.wind_gust >= 80) {
    alerts.push({
      type: "danger",
      key: "wind",
      message_en: `Severe wind gusts: ${row.wind_gust.toFixed(0)} km/h`,
      message_it: `Raffiche di vento intense: ${row.wind_gust.toFixed(0)} km/h`,
    });
  } else if (row.wind_gust !== null && row.wind_gust >= 50) {
    alerts.push({
      type: "warning",
      key: "wind",
      message_en: `Strong wind gusts: ${row.wind_gust.toFixed(0)} km/h`,
      message_it: `Forti raffiche di vento: ${row.wind_gust.toFixed(0)} km/h`,
    });
  }

  // Heavy rain
  if (row.rain_rate !== null && row.rain_rate >= 50) {
    alerts.push({
      type: "danger",
      key: "rain",
      message_en: `Very heavy rain: ${row.rain_rate.toFixed(1)} mm/hr`,
      message_it: `Pioggia molto intensa: ${row.rain_rate.toFixed(1)} mm/hr`,
    });
  } else if (row.rain_rate !== null && row.rain_rate >= 20) {
    alerts.push({
      type: "warning",
      key: "rain",
      message_en: `Heavy rain: ${row.rain_rate.toFixed(1)} mm/hr`,
      message_it: `Pioggia intensa: ${row.rain_rate.toFixed(1)} mm/hr`,
    });
  }

  // Low pressure
  if (row.barometer !== null && row.barometer < 990) {
    alerts.push({
      type: "warning",
      key: "pressure",
      message_en: `Low pressure: ${row.barometer.toFixed(1)} mbar — storm possible`,
      message_it: `Bassa pressione: ${row.barometer.toFixed(1)} mbar — possibile temporale`,
    });
  }

  return NextResponse.json(alerts);
}
