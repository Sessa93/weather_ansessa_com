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

  // Twilio WhatsApp
  twilioAccountSid: required("TWILIO_ACCOUNT_SID"),
  twilioAuthToken: required("TWILIO_AUTH_TOKEN"),
  twilioWhatsappFrom: required("TWILIO_WHATSAPP_FROM"), // e.g. whatsapp:+14155238886

  // Daily forecast broadcast
  dailySummaryCron: process.env.DAILY_SUMMARY_CRON ?? "0 8 * * *",
  timezone: process.env.TZ ?? "Europe/Rome",
  // Comma-separated phone numbers in E.164 format (e.g. +39333...)
  dailyRecipients: (process.env.DAILY_SUMMARY_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  stationName: process.env.STATION_NAME ?? "Jerago con Orago, Italy",
};

export type Config = typeof config;
