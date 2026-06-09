/** Centralised environment configuration for the WhatsApp bot. */

export const config = {
  port: parseInt(process.env.PORT ?? "8085", 10),

  /** Directory where Playwright stores the browser session (cookies, localStorage). */
  authDir: process.env.AUTH_DIR ?? "./auth",

  /** WhatsApp group name to send messages to. */
  groupName: process.env.WHATSAPP_GROUP_NAME ?? "",

  /** Run Chromium headless (true in Docker, set to false for local QR scan). */
  headless: (process.env.HEADLESS ?? "true") === "true",

  /** How long to wait for WhatsApp Web to load (ms). */
  pageLoadTimeout: parseInt(process.env.PAGE_LOAD_TIMEOUT ?? "60000", 10),
};

export type Config = typeof config;
