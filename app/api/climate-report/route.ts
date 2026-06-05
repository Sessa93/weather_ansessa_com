import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const year =
    parseInt(request.nextUrl.searchParams.get("year") ?? "") ||
    new Date().getFullYear();

  // Monthly aggregated stats from weather_readings
  const { rows: monthly } = await pool.query(
    `SELECT
       EXTRACT(MONTH FROM timestamp)::int AS month,
       COUNT(*)::int AS readings,
       ROUND(AVG(outside_temp)::numeric, 1)::float AS avg_temp,
       ROUND(MIN(outside_temp)::numeric, 1)::float AS min_temp,
       ROUND(MAX(outside_temp)::numeric, 1)::float AS max_temp,
       ROUND(AVG(humidity)::numeric, 0)::float AS avg_humidity,
       ROUND(SUM(rain)::numeric, 1)::float AS total_rain,
       ROUND(MAX(rain_rate)::numeric, 1)::float AS max_rain_rate,
       ROUND(AVG(wind_speed)::numeric, 1)::float AS avg_wind,
       ROUND(MAX(wind_gust)::numeric, 1)::float AS max_wind_gust,
       ROUND(AVG(barometer)::numeric, 1)::float AS avg_pressure,
       COUNT(*) FILTER (WHERE rain > 0)::int AS rainy_readings,
       COUNT(*) FILTER (WHERE outside_temp <= 0)::int AS frost_readings,
       COUNT(*) FILTER (WHERE outside_temp >= 30)::int AS hot_readings
     FROM weather_readings
     WHERE EXTRACT(YEAR FROM timestamp) = $1
     GROUP BY EXTRACT(MONTH FROM timestamp)
     ORDER BY month ASC`,
    [year],
  );

  // Yearly totals
  const { rows: yearlyRows } = await pool.query(
    `SELECT
       COUNT(*)::int AS readings,
       ROUND(AVG(outside_temp)::numeric, 1)::float AS avg_temp,
       ROUND(MIN(outside_temp)::numeric, 1)::float AS min_temp,
       ROUND(MAX(outside_temp)::numeric, 1)::float AS max_temp,
       ROUND(AVG(humidity)::numeric, 0)::float AS avg_humidity,
       ROUND(SUM(rain)::numeric, 1)::float AS total_rain,
       ROUND(MAX(rain_rate)::numeric, 1)::float AS max_rain_rate,
       ROUND(AVG(wind_speed)::numeric, 1)::float AS avg_wind,
       ROUND(MAX(wind_gust)::numeric, 1)::float AS max_wind_gust,
       ROUND(AVG(barometer)::numeric, 1)::float AS avg_pressure
     FROM weather_readings
     WHERE EXTRACT(YEAR FROM timestamp) = $1`,
    [year],
  );

  // Historical monthly averages (for anomaly detection)
  const { rows: historical } = await pool.query(
    `SELECT
       EXTRACT(MONTH FROM timestamp)::int AS month,
       ROUND(AVG(outside_temp)::numeric, 1)::float AS avg_temp,
       ROUND((SUM(rain) / NULLIF(COUNT(DISTINCT EXTRACT(YEAR FROM timestamp)), 0))::numeric, 1)::float AS avg_rain,
       ROUND(AVG(wind_speed)::numeric, 1)::float AS avg_wind
     FROM weather_readings
     WHERE EXTRACT(YEAR FROM timestamp) < $1
     GROUP BY EXTRACT(MONTH FROM timestamp)
     ORDER BY month ASC`,
    [year],
  );

  // Available years
  const { rows: years } = await pool.query(
    `SELECT DISTINCT EXTRACT(YEAR FROM timestamp)::int AS year
     FROM weather_readings
     ORDER BY year DESC`,
  );

  const historicalMap = Object.fromEntries(historical.map((h) => [h.month, h]));

  // Enrich monthly data with anomalies
  const enriched = monthly.map((m) => {
    const hist = historicalMap[m.month];
    return {
      ...m,
      temp_anomaly: hist
        ? Math.round((m.avg_temp - hist.avg_temp) * 10) / 10
        : null,
      rain_anomaly:
        hist && hist.avg_rain
          ? Math.round((m.total_rain - hist.avg_rain) * 10) / 10
          : null,
      wind_anomaly: hist
        ? Math.round((m.avg_wind - hist.avg_wind) * 10) / 10
        : null,
    };
  });

  return NextResponse.json({
    year,
    availableYears: years.map((y) => y.year),
    yearly: yearlyRows[0] ?? null,
    monthly: enriched,
  });
}
