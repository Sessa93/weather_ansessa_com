import express from "express";
import cron from "node-cron";
import { config } from "./config.js";
import { answer } from "./agent.js";
import { bot, sendText } from "./telegram.js";
import { sendDailySummary, buildSummary } from "./dailySummary.js";
import { checkAndBroadcastAlerts } from "./alertChecker.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// --- Commands (registered before the catch-all so they aren't sent to the LLM) ---
bot.command("start", async (ctx) => {
  await ctx.reply(
    `Ciao! Sono l'assistente meteo di ${config.stationName}.\n` +
      `Chiedimi le condizioni attuali, storiche o le previsioni.\n\n` +
      `Comandi:\n/previsioni — riepilogo meteo di oggi\n\n` +
      `ID di questa chat: ${ctx.chat.id}\n` +
      `(aggiungilo a DAILY_SUMMARY_CHAT_IDS per ricevere il riepilogo automatico)`,
  );
});

// Manual trigger to verify the daily summary works without waiting for the cron.
bot.command("previsioni", async (ctx) => {
  try {
    const summary = await buildSummary();
    await ctx.reply(summary);
  } catch (err) {
    console.error("[previsioni] Failed:", err);
    await ctx.reply("Scusa, non riesco a recuperare le previsioni al momento.");
  }
});

// --- Inbound Telegram messages ---
bot.on("message:text", (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;
  const from = ctx.from?.username ?? ctx.from?.first_name ?? String(chatId);

  console.log(`[in] ${from} (${chatId}): ${text}`);

  // Process asynchronously so we never block grammy's polling loop.
  void handleMessage(chatId, text);
});

async function handleMessage(chatId: number, text: string): Promise<void> {
  try {
    const reply = await answer(String(chatId), text);
    await sendText(chatId, reply);
    console.log(`[out] ${chatId}: ${reply}`);
  } catch (err) {
    console.error(`[handle] Error for ${chatId}:`, err);
    await sendText(
      chatId,
      "Scusa, si è verificato un errore nel recupero dei dati meteo.",
    ).catch(() => {});
  }
}

// --- Scheduled daily forecast broadcast ---
if (cron.validate(config.dailySummaryCron)) {
  cron.schedule(config.dailySummaryCron, () => void sendDailySummary(), {
    timezone: config.timezone,
  });
  console.log(
    `[cron] Daily summary scheduled: "${config.dailySummaryCron}" (${config.timezone}); ` +
      `${config.dailyChatIds.length} chat id(s) configured` +
      (config.dailyChatIds.length === 0
        ? " — set DAILY_SUMMARY_CHAT_IDS or the broadcast will be skipped"
        : ""),
  );
} else {
  console.error(
    `[cron] Invalid DAILY_SUMMARY_CRON: ${config.dailySummaryCron}`,
  );
}

// --- Alert checker every 5 minutes ---
cron.schedule("*/5 * * * *", () => void checkAndBroadcastAlerts(), {
  timezone: config.timezone,
});
console.log("[cron] Alert checker scheduled: every 5 minutes");

// Start the express health server and the Telegram bot.
app.listen(config.port, () => {
  console.log(`[bot] Health server listening on :${config.port}`);
});

bot.start({
  onStart: () => console.log("[bot] Telegram bot started (long polling)"),
});
