import { config } from "./config.js";

const endpoint =
  `https://graph.facebook.com/${config.whatsappApiVersion}` +
  `/${config.whatsappPhoneNumberId}/messages`;

/** Send a plain text message to a WhatsApp user or group via the Cloud API. */
export async function sendText(
  to: string,
  body: string,
  isGroup = false,
): Promise<void> {
  // WhatsApp text bodies are capped at 4096 chars.
  const text = body.length > 4096 ? body.slice(0, 4093) + "…" : body;

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };
  if (isGroup) {
    payload.recipient_type = "group";
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`WhatsApp send failed (${res.status}): ${detail}`);
  }
}
