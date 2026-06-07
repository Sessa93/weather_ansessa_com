import OpenAI from "openai";
import { config } from "./config.js";
import { fetchForecast } from "./forecast.js";
import { sendText } from "./telegram.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

/** Build the morning forecast summary text via the LLM. */
export async function buildSummary(): Promise<string> {
  const forecast = await fetchForecast(2);
  const today = forecast[0];
  const tomorrow = forecast[1];

  const prompt = [
    `Sei un simpatico meteorologo per una stazione meteo a ${config.stationName}.`,
    "Scrivi un breve riepilogo meteo del buongiorno per la giornata in italiano.",
    "2-3 frasi, unità metriche, menziona intervallo temperature, probabilità pioggia e vento significativo. Nessun saluto finale.",
    "",
    "Today's forecast:",
    JSON.stringify(today),
    tomorrow ? `Tomorrow (for context): ${JSON.stringify(tomorrow)}` : "",
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: config.openaiModel,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 250,
  });

  return (
    completion.choices[0]?.message?.content?.trim() ??
    "Buongiorno! Le previsioni non sono al momento disponibili."
  );
}

/** Compose the daily summary and broadcast it to all configured chat IDs. */
export async function sendDailySummary(): Promise<void> {
  if (config.dailyChatIds.length === 0) {
    console.log("[daily] No chat IDs configured; skipping broadcast.");
    return;
  }

  let summary: string;
  try {
    summary = await buildSummary();
  } catch (err) {
    console.error("[daily] Failed to build summary:", err);
    return;
  }

  for (const chatId of config.dailyChatIds) {
    try {
      await sendText(chatId, summary);
      console.log(`[daily] Sent summary to chat ${chatId}`);
    } catch (err) {
      console.error(`[daily] Failed to send to chat ${chatId}:`, err);
    }
  }
}
