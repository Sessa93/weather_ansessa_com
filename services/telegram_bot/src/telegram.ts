import { Bot } from "grammy";
import { config } from "./config.js";

export const bot = new Bot(config.telegramBotToken);

/** Send a plain text message to a Telegram chat. */
export async function sendText(chatId: string | number, body: string): Promise<void> {
  // Telegram text messages are capped at 4096 chars.
  const text = body.length > 4096 ? body.slice(0, 4093) + "…" : body;
  await bot.api.sendMessage(chatId, text);
}
