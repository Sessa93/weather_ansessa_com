import OpenAI from "openai";
import { config } from "./config.js";
import { fetchForecast } from "./forecast.js";
import { sendText } from "./whatsapp.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

/** Build the morning forecast summary text via the LLM. */
async function buildSummary(): Promise<string> {
  const forecast = await fetchForecast(2);
  const today = forecast[0];
  const tomorrow = forecast[1];

  const prompt = [
    `You are a friendly weather reporter for a station in ${config.stationName}.`,
    `Write a short good-morning forecast for the day ahead in ${config.dailyLanguage}.`,
    "2-3 sentences, metric units, mention temperature range, rain chance, and notable wind. No sign-off.",
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
    "Good morning! Forecast is currently unavailable."
  );
}

/** Compose the daily summary and broadcast it to all configured recipients. */
export async function sendDailySummary(): Promise<void> {
  if (config.dailyRecipients.length === 0) {
    console.log("[daily] No recipients configured; skipping broadcast.");
    return;
  }

  let summary: string;
  try {
    summary = await buildSummary();
  } catch (err) {
    console.error("[daily] Failed to build summary:", err);
    return;
  }

  for (const to of config.dailyRecipients) {
    try {
      await sendText(to, summary);
      console.log(`[daily] Sent summary to ${to}`);
    } catch (err) {
      // Outside the 24h customer-service window, free-form messages are rejected
      // and an approved message template is required instead.
      console.error(`[daily] Failed to send to ${to}:`, err);
    }
  }
}
