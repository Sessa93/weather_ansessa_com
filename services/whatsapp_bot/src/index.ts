import express from "express";
import { config } from "./config.js";
import { init, sendMessage, getStatus, getScreenshot, close } from "./whatsapp.js";

const app = express();
app.use(express.json());

// --- Health / status ---
app.get("/health", (_req, res) => {
  const status = getStatus();
  res.json({ ok: status.ready, ...status });
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
    res.status(503).json({ error: "Browser not ready yet. Try again in a few seconds." });
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
    res.status(400).json({ error: "Missing 'group' (or set WHATSAPP_GROUP_NAME env var)." });
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
    console.log("[whatsapp-bot] Starting API server anyway — retry by restarting the container.");
  }

  app.listen(config.port, () => {
    console.log(`[whatsapp-bot] API listening on :${config.port}`);
    console.log(`[whatsapp-bot] POST /send { "group": "...", "message": "..." }`);
    console.log(`[whatsapp-bot] GET  /health`);
    console.log(`[whatsapp-bot] GET  /qr    (view QR code for remote auth)`);

    const status = getStatus();
    if (status.qrVisible) {
      console.log(`[whatsapp-bot] QR code is waiting — open http://localhost:${config.port}/qr in your browser to scan it.`);
    }
  });
}

void main();
