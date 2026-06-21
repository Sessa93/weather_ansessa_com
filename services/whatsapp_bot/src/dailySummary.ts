import OpenAI from "openai";
import { config } from "./config.js";
import { fetchForecast } from "./forecast.js";
import { summarizeDay } from "./tools.js";
import { sendMessage } from "./whatsapp.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

/**
 * Build the morning summary: a recap of yesterday's actuals (from the station
 * database) followed by today's forecast. Written by the LLM in Italian.
 */
export async function buildSummary(): Promise<string> {
  // Fetch the two data sources in parallel.
  const [forecast, yesterday] = await Promise.all([
    fetchForecast(2),
    summarizeDay(1).catch(() => null),
  ]);
  const today = forecast[0];
  const tomorrow = forecast[1];

  const prompt = [
    `Sei un simpatico meteorologo per una stazione meteo a ${config.stationName}.`,
    "Scrivi il riepilogo meteo del buongiorno in italiano, in due parti:",
    "1) Un breve resoconto di IERI basato sui dati reali misurati dalla stazione (se disponibili): temperature min/max, pioggia totale, vento. 1-2 frasi.",
    "2) Le PREVISIONI per OGGI: intervallo temperature, probabilità di pioggia, vento significativo. 1-2 frasi.",
    "Usa unità metriche. Tono naturale e conciso. Niente saluti finali.",
    "Se i dati di ieri non sono disponibili, ometti la parte 1 senza inventare nulla.",
    "",
    yesterday
      ? `Dati reali misurati IERI: ${JSON.stringify(yesterday)}`
      : "Dati reali di ieri: NON DISPONIBILI",
    "",
    `Previsioni per OGGI: ${JSON.stringify(today)}`,
    tomorrow ? `Domani (solo per contesto): ${JSON.stringify(tomorrow)}` : "",
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: config.openaiModel,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 400,
  });

  return (
    completion.choices[0]?.message?.content?.trim() ??
    "Buongiorno! Le previsioni non sono al momento disponibili."
  );
}

/** Compose the daily summary and broadcast it to all configured groups. */
export async function sendDailySummary(): Promise<void> {
  if (config.dailyGroups.length === 0) {
    console.log("[daily] No groups configured; skipping broadcast.");
    return;
  }

  let summary: string;
  try {
    summary = await buildSummary();
  } catch (err) {
    console.error("[daily] Failed to build summary:", err);
    return;
  }

  for (const group of config.dailyGroups) {
    try {
      await sendMessage(group, summary);
      console.log(`[daily] Sent summary to group "${group}"`);
    } catch (err) {
      console.error(`[daily] Failed to send to group "${group}":`, err);
    }
  }
}
