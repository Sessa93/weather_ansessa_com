/** Centralised environment configuration for the WhatsApp bot. */

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const config = {
  port: parseInt(process.env.PORT ?? "8085", 10),

  /** Directory where Playwright stores the browser session (cookies, localStorage). */
  authDir: process.env.AUTH_DIR ?? "./auth",

  /** WhatsApp group name the bot listens to and replies in. */
  groupName: process.env.WHATSAPP_GROUP_NAME ?? "",

  /** Run Chromium headless (true in Docker, set to false for local QR scan). */
  headless: (process.env.HEADLESS ?? "true") === "true",

  /** How long to wait for WhatsApp Web to load (ms). */
  pageLoadTimeout: parseInt(process.env.PAGE_LOAD_TIMEOUT ?? "60000", 10),

  /** Prefix that triggers the assistant in the group (case-insensitive). */
  triggerPrefix: process.env.TRIGGER_PREFIX ?? "@meteo",

  /** Display name prepended to every outgoing message as a signature. */
  botName: process.env.BOT_NAME ?? "Meteo Jerago Bot",

  /** How often to poll the open chat for new messages (ms). */
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? "3000", 10),

  // OpenAI
  openaiApiKey: required("OPENAI_API_KEY"),
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4.1",

  // Database
  databaseUrl: required("DATABASE_URL"),
  stationLat: process.env.STATION_LAT ?? "45.71",
  stationLon: process.env.STATION_LON ?? "8.79",
  stationName: process.env.STATION_NAME ?? "Jerago con Orago, Italy",

  // Daily forecast broadcast
  dailySummaryCron: process.env.DAILY_SUMMARY_CRON ?? "0 8 * * *",
  timezone: process.env.TZ ?? "Europe/Rome",
  // Comma-separated WhatsApp group names to receive the daily summary and
  // alerts. Defaults to the main group if set.
  dailyGroups: (process.env.DAILY_SUMMARY_GROUPS ??
    process.env.WHATSAPP_GROUP_NAME ??
    "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

export type Config = typeof config;
