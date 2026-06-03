/** Centralised environment configuration for the WhatsApp bot. */

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const config = {
  port: parseInt(process.env.PORT ?? "8080", 10),

  // OpenAI
  openaiApiKey: required("OPENAI_API_KEY"),
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4.1",

  // Database
  databaseUrl: required("DATABASE_URL"),
  stationId: process.env.STATION_ID ?? "jerago",
  stationLat: process.env.STATION_LAT ?? "45.71",
  stationLon: process.env.STATION_LON ?? "8.79",

  // WhatsApp Cloud API
  whatsappToken: required("WHATSAPP_TOKEN"),
  whatsappPhoneNumberId: required("WHATSAPP_PHONE_NUMBER_ID"),
  whatsappVerifyToken: required("WHATSAPP_VERIFY_TOKEN"),
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION ?? "v21.0",

  // Daily forecast broadcast
  dailySummaryCron: process.env.DAILY_SUMMARY_CRON ?? "0 8 * * *",
  timezone: process.env.TZ ?? "Europe/Rome",
  // Comma-separated phone numbers in international format without "+" (e.g. 39333...)
  dailyRecipients: (process.env.DAILY_SUMMARY_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // Groups to send daily summary to (comma-separated group JIDs)
  dailyGroupRecipients: (process.env.DAILY_SUMMARY_GROUPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  stationName: process.env.STATION_NAME ?? "Jerago con Orago, Italy",
};

export type Config = typeof config;
