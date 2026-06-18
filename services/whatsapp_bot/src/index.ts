import express from "express";
import cron from "node-cron";
import { config } from "./config.js";
import { answer } from "./agent.js";
import { sendDailySummary, buildSummary } from "./dailySummary.js";
import { checkAndBroadcastAlerts } from "./alertChecker.js";
import {
  init,
  sendMessage,
  startListening,
  getStatus,
  getScreenshot,
  debugMessages,
  close,
} from "./whatsapp.js";

const app = express();
app.use(express.json());

// --- Health / status ---
app.get("/health", (_req, res) => {
  const status = getStatus();
  res.json({
    ok: status.ready,
    version: process.env.npm_package_version ?? "unknown",
    ...status,
  });
});

// Express parses a repeated query key (?group=A&group=B) as a string[], not
// a string — take the first string value rather than trusting a blind cast.
function firstQueryString(v: unknown): string | undefined {
  if (typeof v === "string" && v) return v;
  if (Array.isArray(v) && typeof v[0] === "string" && v[0]) return v[0];
  return undefined;
}

// --- DOM message debug: dump raw structure of last N messages in the group ---
app.get("/debug/messages", async (_req, res) => {
  const group = firstQueryString(_req.query.group) ?? config.groupName;
  if (!group) {
    res.status(400).json({ error: "No group configured." });
    return;
  }
  try {
    const data = await debugMessages(group, 10);
    res.json(data);
  } catch (err) {
    console.error("[api] /debug/messages failed:", err);
    res.status(500).json({
      error: "Failed to read messages.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

// --- Page screenshot (debugging: see what WhatsApp Web is showing) ---
app.get("/screenshot", async (_req, res) => {
  try {
    const png = await getScreenshot();
    if (!png) {
      res.status(503).json({ error: "Browser not ready." });
      return;
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.send(png);
  } catch (err) {
    console.error("[api] /screenshot failed:", err);
    res.status(500).json({
      error: "Failed to capture screenshot.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

// --- QR code screenshot (for remote auth) ---
app.get("/qr", async (_req, res) => {
  const status = getStatus();
  if (status.authenticated) {
    res.json({ ok: true, message: "Already authenticated — no QR needed." });
    return;
  }

  const png = await getScreenshot();
  if (!png) {
    res
      .status(503)
      .json({ error: "Browser not ready yet. Try again in a few seconds." });
    return;
  }

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-store");
  res.send(png);
});

// --- Send a message ---
app.post("/send", async (req, res) => {
  const { group, message } = req.body as {
    group?: string;
    message?: string;
  };

  const targetGroup = group ?? config.groupName;

  if (!targetGroup) {
    res
      .status(400)
      .json({ error: "Missing 'group' (or set WHATSAPP_GROUP_NAME env var)." });
    return;
  }
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Missing or invalid 'message'." });
    return;
  }

  const status = getStatus();
  if (!status.ready) {
    res.status(503).json({
      error: "WhatsApp Web is not ready. Scan the QR code first.",
      ...status,
    });
    return;
  }

  try {
    await sendMessage(targetGroup, message);
    res.json({ ok: true, group: targetGroup });
  } catch (err) {
    console.error("[api] Send failed:", err);
    res.status(500).json({
      error: "Failed to send message.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

// --- Inbound messages: trigger-prefixed questions go to the LLM agent ---
const PREVISIONI_RE = /^[!/]?previsioni\b/i;

function handleIncoming(sender: string, text: string): void {
  const trimmed = text.trim();
  const prefix = config.triggerPrefix.toLowerCase();
  if (!trimmed.toLowerCase().startsWith(prefix)) return;

  const question = trimmed.slice(config.triggerPrefix.length).trim();
  console.log(`[in] ${sender}: ${question}`);

  void (async () => {
    try {
      // "previsioni" command: today's forecast summary, same as Telegram's
      // /previsioni — anything else goes to the agent.
      const reply = PREVISIONI_RE.test(question)
        ? await buildSummary()
        : await answer(sender, question);
      await sendMessage(config.groupName, reply);
      console.log(`[out] ${sender}: ${reply}`);
    } catch (err) {
      console.error(`[handle] Error for ${sender}:`, err);
      await sendMessage(
        config.groupName,
        "Scusa, si è verificato un errore nel recupero dei dati meteo.",
      ).catch(() => {});
    }
  })();
}

// --- Scheduled daily forecast broadcast ---
if (cron.validate(config.dailySummaryCron)) {
  cron.schedule(config.dailySummaryCron, () => void sendDailySummary(), {
    timezone: config.timezone,
  });
  console.log(
    `[cron] Daily summary scheduled: "${config.dailySummaryCron}" (${config.timezone}); ` +
      `${config.dailyGroups.length} group(s) configured` +
      (config.dailyGroups.length === 0
        ? " — set DAILY_SUMMARY_GROUPS or WHATSAPP_GROUP_NAME or the broadcast will be skipped"
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

// --- Graceful shutdown ---
async function shutdown() {
  console.log("[whatsapp-bot] Shutting down...");
  await close();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

// --- Start ---
async function main() {
  try {
    await init();
  } catch (err) {
    console.error("[whatsapp-bot] Failed to initialize WhatsApp:", err);
    console.log(
      "[whatsapp-bot] Starting API server anyway — retry by restarting the container.",
    );
  }

  if (config.groupName) {
    startListening(config.groupName, (msg) =>
      handleIncoming(msg.sender, msg.text),
    );
    console.log(
      `[whatsapp-bot] Agent active — trigger messages with "${config.triggerPrefix}"`,
    );
  } else {
    console.warn(
      "[whatsapp-bot] WHATSAPP_GROUP_NAME not set — inbound listening disabled.",
    );
  }

  app.listen(config.port, () => {
    console.log(`[whatsapp-bot] API listening on :${config.port}`);
    console.log(
      `[whatsapp-bot] POST /send { "group": "...", "message": "..." }`,
    );
    console.log(`[whatsapp-bot] GET  /health`);
    console.log(`[whatsapp-bot] GET  /qr    (view QR code for remote auth)`);

    const status = getStatus();
    if (status.qrVisible) {
      console.log(
        `[whatsapp-bot] QR code is waiting — open http://localhost:${config.port}/qr in your browser to scan it.`,
      );
    }
  });
}

void main();
