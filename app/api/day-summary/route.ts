import pool from "@/lib/db";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/server-locale";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map<string, { summary: string; ts: number }>();

export async function GET() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 503 },
    );
  }

  // Check in-memory cache (6h TTL)
  const hit = cache.get(locale);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return NextResponse.json({ summary: hit.summary });
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
    WHERE (timestamp AT TIME ZONE '${process.env.TZ ?? "Europe/Rome"}')::date = (NOW() AT TIME ZONE '${process.env.TZ ?? "Europe/Rome"}')::date
  `);

  const stats = rows[0];

  if (!stats || Number(stats.readings) === 0) {
    return NextResponse.json({ summary: messages.daySummary.noData });
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
  const trendLabel =
    locale === "it"
      ? baroTrend > 0.5
        ? "in aumento"
        : baroTrend < -0.5
          ? "in calo"
          : "stabile"
      : baroTrend > 0.5
        ? "rising"
        : baroTrend < -0.5
          ? "falling"
          : "steady";

  const prompt =
    locale === "it"
      ? `Sei un cronista meteo cordiale per una stazione meteorologica locale di Jerago con Orago, Italia (Lombardia, vicino a Varese).
In base ai dati qui sotto, riassumi prima il meteo di oggi finora in 2-3 frasi, poi fornisci una breve previsione per il resto della giornata in 1-2 frasi.

Dati di oggi finora:
- Temperatura: min ${stats.temp_min}°C, max ${stats.temp_max}°C, media ${stats.temp_avg}°C
- Umidita: min ${stats.hum_min}%, max ${stats.hum_max}%, media ${stats.hum_avg}%
- Vento: media ${stats.wind_avg} km/h, raffica max ${stats.wind_gust_max} km/h
- Pioggia: totale ${stats.rain_total} mm, intensita max ${stats.rain_rate_max} mm/h
- Barometro: ${stats.baro_min}–${stats.baro_max} mbar (attualmente ${trendLabel})
- Punto di rugiada: ${stats.dew_min}–${stats.dew_max}°C
- Wind chill minimo: ${stats.wind_chill_min}°C, indice di calore massimo: ${stats.heat_index_max}°C

Usa il trend barometrico, i livelli di umidita, l'andamento della temperatura e l'eventuale pioggia per dedurre la previsione. Sii naturale, cita condizioni notevoli (caldo/freddo, pioggia, vento). Usa unita metriche. Non aggiungere saluti o formule finali. Formattta la previsione come un breve paragrafo separato che inizi con "${messages.daySummary.forecastPrefix}".`
      : `You are a friendly weather reporter for a local weather station in Jerago con Orago, Italy (Lombardy, near Varese).
Based on the data below, first summarize today's weather so far in 2-3 sentences, then provide a brief forecast for the rest of the day in 1-2 sentences.

Today's data so far:
- Temperature: min ${stats.temp_min}°C, max ${stats.temp_max}°C, avg ${stats.temp_avg}°C
- Humidity: min ${stats.hum_min}%, max ${stats.hum_max}%, avg ${stats.hum_avg}%
- Wind: avg ${stats.wind_avg} km/h, max gust ${stats.wind_gust_max} km/h
- Rain: total ${stats.rain_total} mm, max rate ${stats.rain_rate_max} mm/hr
- Barometer: ${stats.baro_min}–${stats.baro_max} mbar (currently ${trendLabel})
- Dew point: ${stats.dew_min}–${stats.dew_max}°C
- Wind chill low: ${stats.wind_chill_min}°C, Heat index high: ${stats.heat_index_max}°C

Use the barometric pressure trend, humidity levels, temperature patterns, and any rain activity to infer the forecast. Be natural, mention notable conditions (hot/cold, rain, wind). Use metric units. Do not add greetings or sign-offs. Format the forecast as a separate short paragraph starting with "${messages.daySummary.forecastPrefix}".`;

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.7,
  });

  const summary =
    completion.choices[0]?.message?.content?.trim() ??
    messages.daySummary.unable;

  cache.set(locale, { summary, ts: Date.now() });

  return NextResponse.json({ summary });
}
