import express from "express";
import cron from "node-cron";
import { config } from "./config.js";
import { answer } from "./agent.js";
import { sendText } from "./whatsapp.js";
import { sendDailySummary } from "./dailySummary.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// --- Webhook verification (Meta calls this once when you register the URL) ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.whatsappVerifyToken) {
    console.log("[webhook] Verified.");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// --- Inbound messages ---
app.post("/webhook", (req, res) => {
  // Acknowledge immediately; Meta retries if we don't 200 within seconds.
  res.sendStatus(200);

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message || message.type !== "text") return;

    const from: string = message.from;
    const text: string = message.text.body;
    console.log(`[in] ${from}: ${text}`);

    // Process asynchronously so we never block the webhook response.
    void handleMessage(from, text);
  } catch (err) {
    console.error("[webhook] Parse error:", err);
  }
});

async function handleMessage(from: string, text: string): Promise<void> {
  try {
    const reply = await answer(from, text);
    await sendText(from, reply);
    console.log(`[out] ${from}: ${reply}`);
  } catch (err) {
    console.error(`[handle] Error for ${from}:`, err);
    await sendText(
      from,
      "Sorry, something went wrong fetching the weather data.",
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
  console.error(`[cron] Invalid DAILY_SUMMARY_CRON: ${config.dailySummaryCron}`);
}

app.listen(config.port, () => {
  console.log(`[bot] WhatsApp bot listening on :${config.port}`);
});
