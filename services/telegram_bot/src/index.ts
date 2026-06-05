import express from "express";
import cron from "node-cron";
import { config } from "./config.js";
import { answer } from "./agent.js";
import { bot, sendText } from "./telegram.js";
import { sendDailySummary } from "./dailySummary.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

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
    `[cron] Daily summary scheduled: "${config.dailySummaryCron}" (${config.timezone})`,
  );
} else {
  console.error(
    `[cron] Invalid DAILY_SUMMARY_CRON: ${config.dailySummaryCron}`,
  );
}

// Start the express health server and the Telegram bot.
app.listen(config.port, () => {
  console.log(`[bot] Health server listening on :${config.port}`);
});

bot.start({
  onStart: () => console.log("[bot] Telegram bot started (long polling)"),
});
