import { config } from "./config.js";
import twilio from "twilio";

const client = twilio(config.twilioAccountSid, config.twilioAuthToken);

/** Send a plain text message to a WhatsApp number via Twilio. */
export async function sendText(to: string, body: string): Promise<void> {
  // WhatsApp text bodies are capped at 4096 chars.
  const text = body.length > 4096 ? body.slice(0, 4093) + "…" : body;

  // Ensure the "to" number has the whatsapp: prefix.
  const toWhatsapp = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const msg = await client.messages.create({
    from: config.twilioWhatsappFrom,
    to: toWhatsapp,
    body: text,
  });

  console.log(`[twilio] Message ${msg.sid} sent to ${toWhatsapp}`);
}
