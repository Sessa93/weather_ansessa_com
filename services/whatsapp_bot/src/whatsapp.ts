import { config } from "./config.js";

const endpoint =
  `https://graph.facebook.com/${config.whatsappApiVersion}` +
  `/${config.whatsappPhoneNumberId}/messages`;

/** Send a plain text message to a WhatsApp user via the Cloud API. */
export async function sendText(to: string, body: string): Promise<void> {
  // WhatsApp text bodies are capped at 4096 chars.
  const text = body.length > 4096 ? body.slice(0, 4093) + "…" : body;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`WhatsApp send failed (${res.status}): ${detail}`);
  }
}
