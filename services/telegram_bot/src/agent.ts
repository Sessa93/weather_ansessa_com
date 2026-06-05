import OpenAI from "openai";
import { config } from "./config.js";
import { toolDefinitions, executeTool } from "./tools.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

const MAX_TOOL_ROUNDS = 5;
const HISTORY_TURNS = 8; // user+assistant messages retained per sender
const HISTORY_TTL_MS = 60 * 60 * 1000; // forget a conversation after 1h idle

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

interface Conversation {
  messages: ChatMessage[];
  lastActive: number;
}

const conversations = new Map<string, Conversation>();

/**
 * Return the current local date/time as ISO 8601 with UTC offset,
 * e.g. "2026-06-05T10:30:00+02:00".
 */
function localISONow(): string {
  const now = new Date();
  const utcDate = new Date(
    now.toLocaleString("en-US", { timeZone: "UTC" }),
  );
  const tzDate = new Date(
    now.toLocaleString("en-US", { timeZone: config.timezone }),
  );
  const offsetMs = tzDate.getTime() - utcDate.getTime();
  const sign = offsetMs >= 0 ? "+" : "-";
  const absMs = Math.abs(offsetMs);
  const h = String(Math.floor(absMs / 3_600_000)).padStart(2, "0");
  const m = String(Math.floor((absMs % 3_600_000) / 60_000)).padStart(2, "0");
  const offset = `${sign}${h}:${m}`;
  // sv-SE locale gives "YYYY-MM-DD HH:MM:SS"
  const local = now.toLocaleString("sv-SE", { timeZone: config.timezone });
  return local.replace(" ", "T") + offset;
}

/**
 * Stable instructions first so OpenAI's automatic prompt caching can reuse the
 * prefix across calls; the volatile current-date line goes last.
 */
function systemPrompt(): string {
  const now = localISONow();
  return [
    `Sei l'assistente meteo per una stazione meteorologica personale a ${config.stationName}.`,
    "Rispondi sempre e solo in italiano, indipendentemente dalla lingua del messaggio ricevuto.",
    "Rispondi a domande sulle condizioni meteo attuali, storiche e sulle previsioni.",
    "Usa sempre gli strumenti forniti per recuperare dati reali — non inventare mai numeri.",
    "Usa unità metriche (°C, km/h, mm, mbar). Mantieni le risposte brevi e colloquiali, adatte a Telegram.",
    "Se sei in un gruppo, rispondi in modo conciso e pertinente.",
    "Quando una domanda si riferisce a un periodo (oggi, ieri, questa settimana, ecc.), calcola i timestamp ISO 8601 CON OFFSET UTC dalla data/ora qui sotto e chiama get_historical_summary.",
    "Per 'oggi' usa inizio = mezzanotte locale (00:00:00) con l'offset, fine = data/ora corrente.",
    "Includi SEMPRE l'offset UTC nei timestamp (es. +02:00), mai usare 'Z' o timestamp senza offset.",
    "Se uno strumento non restituisce dati, dillo chiaramente senza inventare.",
    `Data e ora correnti (${config.timezone}): ${now}`,
  ].join("\n");
}

function getConversation(sender: string): Conversation {
  const existing = conversations.get(sender);
  if (existing && Date.now() - existing.lastActive < HISTORY_TTL_MS) {
    return existing;
  }
  const fresh: Conversation = { messages: [], lastActive: Date.now() };
  conversations.set(sender, fresh);
  return fresh;
}

/**
 * Run the tool-calling loop for one inbound user message and return the reply
 * text. Per-sender history is kept in memory so follow-up questions work.
 */
export async function answer(
  sender: string,
  userText: string,
): Promise<string> {
  const convo = getConversation(sender);
  convo.lastActive = Date.now();

  // Trim retained history, then add the new user turn.
  if (convo.messages.length > HISTORY_TURNS) {
    convo.messages = convo.messages.slice(-HISTORY_TURNS);
  }
  convo.messages.push({ role: "user", content: userText });

  // Per-request working copy: stable system prompt first, then history.
  const working: ChatMessage[] = [
    { role: "system", content: systemPrompt() },
    ...convo.messages,
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await openai.chat.completions.create({
      model: config.openaiModel,
      messages: working,
      tools: toolDefinitions,
      temperature: 0.4,
      max_tokens: 600,
    });

    const msg = completion.choices[0]?.message;
    if (!msg) break;
    working.push(msg);

    if (!msg.tool_calls?.length) {
      const reply =
        msg.content?.trim() ||
        "Scusa, non sono riuscito a produrre una risposta.";
      convo.messages.push({ role: "assistant", content: reply });
      return reply;
    }

    // Execute each requested tool and feed results back.
    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      let result: unknown;
      try {
        const args = call.function.arguments
          ? JSON.parse(call.function.arguments)
          : {};
        result = await executeTool(call.function.name, args);
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) };
      }
      working.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  const fallback =
    "Scusa, ci sono voluti troppi passaggi per rispondere. Prova a riformulare la domanda.";
  convo.messages.push({ role: "assistant", content: fallback });
  return fallback;
}
