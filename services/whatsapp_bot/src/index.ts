import express from "express";
import cron from "node-cron";
import twilio from "twilio";
import { config } from "./config.js";
import { answer } from "./agent.js";
import { sendText } from "./whatsapp.js";
import { sendDailySummary } from "./dailySummary.js";

const app = express();
app.use(express.urlencoded({ extended: false })); // Twilio sends form-encoded
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// --- Inbound messages (Twilio sends form-encoded POST) ---
app.post("/webhook", (req, res) => {
  // Validate the request comes from Twilio
  const signature = req.headers["x-twilio-signature"] as string | undefined;
  const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  if (
    !signature ||
    !twilio.validateRequest(
      config.twilioAuthToken,
      signature,
      url,
      req.body,
    )
  ) {
    console.warn("[webhook] Invalid Twilio signature");
    res.sendStatus(403);
    return;
  }

  // Acknowledge immediately so Twilio doesn't retry.
  res.sendStatus(200);

  try {
    const from: string = req.body.From; // e.g. whatsapp:+39333...
    const body: string = req.body.Body;
    if (!from || !body) return;

    console.log(`[in] ${from}: ${body}`);

    // Process asynchronously so we never block the webhook response.
    void handleMessage(from, body);
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

app.listen(config.port, () => {
  console.log(`[bot] WhatsApp bot listening on :${config.port}`);
});
