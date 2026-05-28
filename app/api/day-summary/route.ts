import pool from "@/lib/db";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 503 },
    );
  }

  // Gather today's stats
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) AS readings,
      ROUND(MIN(outside_temp)::numeric, 1) AS temp_min,
      ROUND(MAX(outside_temp)::numeric, 1) AS temp_max,
      ROUND(AVG(outside_temp)::numeric, 1) AS temp_avg,
      ROUND(MIN(humidity)::numeric, 0) AS hum_min,
      ROUND(MAX(humidity)::numeric, 0) AS hum_max,
      ROUND(AVG(humidity)::numeric, 0) AS hum_avg,
      ROUND(MAX(wind_gust)::numeric, 1) AS wind_gust_max,
      ROUND(AVG(wind_speed)::numeric, 1) AS wind_avg,
      ROUND(SUM(rain)::numeric, 1) AS rain_total,
      ROUND(MAX(rain_rate)::numeric, 1) AS rain_rate_max,
      ROUND(MIN(barometer)::numeric, 1) AS baro_min,
      ROUND(MAX(barometer)::numeric, 1) AS baro_max,
      ROUND(MIN(dew_point)::numeric, 1) AS dew_min,
      ROUND(MAX(dew_point)::numeric, 1) AS dew_max,
      ROUND(MIN(wind_chill)::numeric, 1) AS wind_chill_min,
      ROUND(MAX(heat_index)::numeric, 1) AS heat_index_max
    FROM weather_readings
    WHERE timestamp::date = CURRENT_DATE
  `);

  const stats = rows[0];

  if (!stats || Number(stats.readings) === 0) {
    return NextResponse.json({ summary: "No data available for today yet." });
  }

  // Pressure trend (last 3 hours)
  const { rows: trendRows } = await pool.query(`
    SELECT
      ROUND((
        (AVG(barometer) FILTER (WHERE timestamp >= NOW() - INTERVAL '30 minutes'))
        - (AVG(barometer) FILTER (WHERE timestamp BETWEEN NOW() - INTERVAL '3 hours' AND NOW() - INTERVAL '2 hours 30 minutes'))
      )::numeric, 1) AS baro_trend
    FROM weather_readings
    WHERE timestamp >= NOW() - INTERVAL '3 hours'
  `);
  const baroTrend = Number(trendRows[0]?.baro_trend) || 0;
  const trendLabel = baroTrend > 0.5 ? "rising" : baroTrend < -0.5 ? "falling" : "steady";

  const prompt = `You are a friendly weather reporter for a local weather station in Jerago con Orago, Italy (Lombardy, near Varese).
Based on the data below, first summarize today's weather so far in 2-3 sentences, then provide a brief forecast for the rest of the day in 1-2 sentences.

Today's data so far:
- Temperature: min ${stats.temp_min}°C, max ${stats.temp_max}°C, avg ${stats.temp_avg}°C
- Humidity: min ${stats.hum_min}%, max ${stats.hum_max}%, avg ${stats.hum_avg}%
- Wind: avg ${stats.wind_avg} km/h, max gust ${stats.wind_gust_max} km/h
- Rain: total ${stats.rain_total} mm, max rate ${stats.rain_rate_max} mm/hr
- Barometer: ${stats.baro_min}–${stats.baro_max} mbar (currently ${trendLabel})
- Dew point: ${stats.dew_min}–${stats.dew_max}°C
- Wind chill low: ${stats.wind_chill_min}°C, Heat index high: ${stats.heat_index_max}°C

Use the barometric pressure trend, humidity levels, temperature patterns, and any rain activity to infer the forecast. Be natural, mention notable conditions (hot/cold, rain, wind). Use metric units. Do not add greetings or sign-offs. Format the forecast as a separate short paragraph starting with "Forecast:".`;

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.7,
  });

  const summary =
    completion.choices[0]?.message?.content?.trim() ??
    "Unable to generate summary.";

  return NextResponse.json({ summary });
}
