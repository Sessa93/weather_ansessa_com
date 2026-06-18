import { chromium, type BrowserContext, type Page } from "playwright";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { config } from "./config.js";

const SEEN_FILE = join(config.authDir, "seen-messages.json");

function loadSeen(): Set<string> {
  try {
    const ids = JSON.parse(readFileSync(SEEN_FILE, "utf8")) as string[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

// Write to a temp file and rename over the target so a process kill mid-write
// can never leave seen-messages.json truncated or corrupt.
function saveSeen(seen: Set<string>): void {
  try {
    const tmp = `${SEEN_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify([...seen]));
    renameSync(tmp, SEEN_FILE);
  } catch (err) {
    console.error("[whatsapp] Failed to save seen set:", err);
  }
}

let context: BrowserContext | null = null;
let page: Page | null = null;
let ready = false;
let qrVisible = false;

/** Serialise all page interactions: the poller and senders share one page. */
let opQueue: Promise<unknown> = Promise.resolve();
function withPageLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = opQueue.then(fn, fn);
  opQueue = run.catch(() => {});
  return run;
}

/** Current connection state. */
export function getStatus(): {
  ready: boolean;
  qrVisible: boolean;
  authenticated: boolean;
} {
  return {
    ready,
    qrVisible,
    authenticated: ready && !qrVisible,
  };
}

/** Launch browser, open WhatsApp Web, and wait for authentication. */
export async function init(): Promise<void> {
  // Ensure auth directory exists for session persistence
  if (!existsSync(config.authDir)) {
    mkdirSync(config.authDir, { recursive: true });
  }

  console.log(`[whatsapp] Launching Chromium (headless=${config.headless})...`);

  context = await chromium.launchPersistentContext(config.authDir, {
    headless: config.headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "it-IT",
    timezoneId: "Europe/Rome",
  });

  page = context.pages()[0] ?? (await context.newPage());

  console.log("[whatsapp] Navigating to WhatsApp Web...");
  await page.goto("https://web.whatsapp.com", {
    waitUntil: "domcontentloaded",
    timeout: config.pageLoadTimeout,
  });

  // Wait for either the QR code or the chat list (already authenticated)
  console.log("[whatsapp] Waiting for authentication...");

  try {
    await Promise.race([waitForQrCode(page), waitForChatList(page)]);
  } catch (err) {
    console.error("[whatsapp] Auth detection failed:", err);
    throw err;
  }
}

async function waitForQrCode(p: Page): Promise<void> {
  // WhatsApp Web shows a canvas with the QR code
  await p.waitForSelector(
    'canvas[aria-label="Scan this QR code to link a device!"], div[data-ref]',
    {
      timeout: config.pageLoadTimeout,
    },
  );

  // Check if we actually landed on the QR (not the chat list)
  const chatList = await p.$(
    'div[aria-label="Chat list"], div[id="pane-side"]',
  );
  if (chatList) {
    // Already authenticated — the race was won by an old session
    ready = true;
    qrVisible = false;
    console.log("[whatsapp] Already authenticated (session restored).");
    return;
  }

  qrVisible = true;
  ready = false;
  console.log(
    "[whatsapp] QR code visible — scan it with your phone to authenticate.",
  );
  console.log("[whatsapp] GET /qr to view the QR code from a browser.");

  // Wait for QR scan in the background so init() can return and start the API
  void waitForChatList(p);
}

async function waitForChatList(p: Page): Promise<void> {
  await p.waitForSelector('div[id="pane-side"], div[aria-label="Chat list"]', {
    timeout: 120_000, // 2 minutes to scan QR
  });
  ready = true;
  qrVisible = false;
  console.log("[whatsapp] Authenticated and ready.");
}

// WhatsApp Web's DOM attributes change between releases, so every lookup
// tries several known selector variants.
const SEARCH_BOX_SELECTOR = [
  '#side div[contenteditable="true"][data-tab="3"]',
  'div[aria-label="Search input textbox"]',
  '#side div[contenteditable="true"][role="textbox"]',
  '#side [data-testid="chat-list-search"]',
  'div[contenteditable="true"][aria-placeholder="Search or start a new chat"]',
  'div[contenteditable="true"][aria-placeholder="Cerca o inizia una nuova chat"]',
].join(", ");

const MESSAGE_BOX_SELECTOR = [
  'div[contenteditable="true"][data-tab="10"]',
  'footer div[contenteditable="true"]',
  'div[aria-label="Type a message"]',
  'div[contenteditable="true"][aria-placeholder="Type a message"]',
  'div[contenteditable="true"][aria-placeholder="Scrivi un messaggio"]',
].join(", ");

// Escape a value interpolated into a double-quoted CSS attribute selector so
// a stray `"` (e.g. from /debug/messages's unauthenticated `group` query
// param) can't break out of the attribute value.
function escapeAttr(value: string): string {
  return value.replace(/[\\"]/g, "\\$&");
}

/** Open a chat by display name: click its sidebar row, searching if needed. */
async function openChat(p: Page, chatName: string): Promise<void> {
  const safeName = escapeAttr(chatName);

  // Already open? The conversation header shows the chat title.
  const header = p.locator(`#main header span[title="${safeName}"]`);
  if (await header.count()) return;

  // Fast path: the chat row is already visible in the sidebar list. Scoped
  // to #side so a same-titled element elsewhere on the page (e.g. a quoted
  // message) can't be matched instead.
  const row = p.locator(`#side span[title="${safeName}"]`).first();
  if (!(await row.isVisible().catch(() => false))) {
    const searchBox = p
      .locator(SEARCH_BOX_SELECTOR)
      .or(p.getByRole("textbox", { name: /search|cerca/i }))
      .first();
    try {
      await searchBox.click({ timeout: 10_000 });
    } catch {
      // The search box can be hidden behind an overlay (update banner,
      // dialog). Press Escape to dismiss it and retry once.
      await p.keyboard.press("Escape");
      await searchBox.click({ timeout: 5_000 });
    }
    await searchBox.fill("");
    await searchBox.pressSequentially(chatName, { delay: 50 });
    await row.waitFor({ timeout: 10_000 });
  }
  await row.click();

  await p.locator(MESSAGE_BOX_SELECTOR).first().waitFor({ timeout: 10_000 });
}

/**
 * Send a text message to a specific chat (group or contact display name).
 */
export async function sendMessage(
  chatName: string,
  message: string,
): Promise<void> {
  if (!page || !ready) {
    throw new Error("WhatsApp Web is not ready yet.");
  }
  const p = page;

  // Sign every outgoing message so readers know it came from the bot.
  const signed = `🤖 *${config.botName}*\n${message}`;

  await withPageLock(async () => {
    console.log(`[whatsapp] Sending message to "${chatName}"...`);
    await openChat(p, chatName);

    const messageBox = p.locator(MESSAGE_BOX_SELECTOR).first();
    await messageBox.click();

    // Type line by line: a plain Enter would send each line as a separate
    // message, Shift+Enter inserts a line break instead.
    const lines = signed.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) await p.keyboard.press("Shift+Enter");
      if (lines[i]) await p.keyboard.insertText(lines[i]);
    }
    await p.keyboard.press("Enter");

    // Brief wait to confirm send
    await p.waitForTimeout(1000);
    console.log(`[whatsapp] Message sent to "${chatName}".`);
  });
}

export interface IncomingMessage {
  id: string;
  sender: string;
  text: string;
}

// Shared building blocks for the two browser-side message-row walkers (the
// hoisted fn2 below and debugMessages's fn) so a selector fix only has to
// happen in one place instead of two independently-drifting copies.
const ROW_QUERY_JS = `document.querySelectorAll(${JSON.stringify("[data-id]")})`;
const PRE_PLAIN_TEXT_QUERY_JS = `row.querySelector(${JSON.stringify("[data-pre-plain-text]")})`;
const TEXT_EXTRACT_JS = ["span[dir='ltr']", "span.selectable-text", "span[dir='auto']"]
  .map((sel) => `row.querySelector(${JSON.stringify(sel)})`)
  .join(" || ");

// In the new WhatsApp Web UI there is no "message-in" class. Instead:
// - Incoming messages have data-pre-plain-text = "[HH:MM, D/M/YYYY] Sender: "
// - Outgoing messages (bot's own) have no data-pre-plain-text element.
// We select all [data-id] rows and filter by presence of that attribute.
// Built once at module load: this script has no per-tick dependencies, so
// re-parsing it on every poll tick would be wasted work.
const fn2 = new Function(
  `
  const rows = [...${ROW_QUERY_JS}];
  return rows.map(row => {
    const prePlainEl = ${PRE_PLAIN_TEXT_QUERY_JS};
    const pre = prePlainEl?.getAttribute("data-pre-plain-text") ?? null;
    const textEl = ${TEXT_EXTRACT_JS};
    const text =
      textEl?.innerText?.trim() ||
      textEl?.textContent?.trim() ||
      "";
    return {
      id: row.getAttribute("data-id") ?? "",
      pre,
      text,
    };
  }).filter(m => m.pre !== null); // keep only incoming messages
`,
) as () => Array<{ id: string; pre: string; text: string }>;

let listening = false;

/**
 * Watch the configured group for new incoming messages and invoke the
 * callback for each one. Messages already on screen at startup are skipped.
 */
export function startListening(
  groupName: string,
  onMessage: (msg: IncomingMessage) => void,
): void {
  if (listening) return;
  listening = true;

  // Load previously-seen IDs from disk so restarts never re-process old
  // messages. If no state file exists yet (first-ever deploy, or it was lost
  // to a non-atomic write race in the past), prime on the first poll instead:
  // record what's currently on screen as seen without dispatching it, the
  // same protection the old in-memory `primed` flag gave every restart.
  const seenFileExisted = existsSync(SEEN_FILE);
  const seen = loadSeen();
  let primed = seenFileExisted;
  console.log(
    `[whatsapp] Loaded ${seen.size} seen message ID(s) from disk` +
      (primed ? "." : " (no prior state — priming on first poll)."),
  );

  const poll = async (): Promise<void> => {
    if (!page || !ready) return;

    await withPageLock(async () => {
      if (!page) return; // may have been closed while queued behind the lock
      const p = page;
      await openChat(p, groupName);

      const messages = await p.evaluate(fn2);

      let added = false;
      for (const m of messages) {
        if (!m.id || seen.has(m.id)) continue;
        seen.add(m.id);
        added = true;
        if (!primed) continue; // skip history present at this first poll

        // pre = "[HH:MM, D/M/YYYY] Sender: "
        const sender = (m.pre ?? "")
          .replace(/^\[[^\]]*\]\s*/, "")
          .replace(/:\s*$/, "");
        if (m.text.trim()) {
          onMessage({ id: m.id, sender: sender || "unknown", text: m.text });
        }
      }
      primed = true;

      // Bound memory: data-ids of long-gone messages can be dropped.
      let trimmed = false;
      if (seen.size > 2000) {
        for (const id of [...seen].slice(0, 1000)) seen.delete(id);
        trimmed = true;
      }

      // Persist seen set so restarts don't re-process old messages — only
      // when it actually changed, to avoid a write every idle tick.
      if (added || trimmed) saveSeen(seen);
    }).catch((err) => {
      console.error(
        "[whatsapp] Poll failed:",
        err instanceof Error ? err.message : err,
      );
    });
  };

  // Never let polls pile up in the page-lock queue: a slow or failing poll
  // would otherwise starve sendMessage calls waiting on the same lock.
  let pollInFlight = false;
  setInterval(() => {
    if (pollInFlight) return;
    pollInFlight = true;
    void poll().finally(() => {
      pollInFlight = false;
    });
  }, config.pollIntervalMs);
  console.log(
    `[whatsapp] Listening for messages in "${groupName}" (every ${config.pollIntervalMs}ms)`,
  );
}

// Built once: like fn2, this has no per-call dependencies (the row limit is
// passed as an evaluate() argument, not baked into the source). p.evaluate
// runs the function in the browser context (has DOM APIs) — we cast through
// unknown to avoid TypeScript's lib:dom requirement.
const debugFn = new Function(
  "lim",
  `
  const rows = [...${ROW_QUERY_JS}].slice(-lim);
  return rows.map(row => ({
    dataId: row.getAttribute("data-id"),
    prePlainText: (${PRE_PLAIN_TEXT_QUERY_JS})?.getAttribute("data-pre-plain-text") ?? null,
    innerText: row.innerText?.trim().slice(0, 200) ?? null,
    selectableText: row.querySelector("span.selectable-text")?.innerText?.trim() ?? null,
    spanDirLtr: row.querySelector("span[dir='ltr']")?.innerText?.trim() ?? null,
    copyableText: row.querySelector(".copyable-text")?.innerText?.trim().slice(0, 100) ?? null,
    spanCount: row.querySelectorAll("span").length,
    outerHtmlSnippet: row.outerHTML.slice(0, 400),
  }));
`,
) as (lim: number) => unknown;

/**
 * Open the group and return raw DOM data for the last N message rows —
 * used to figure out correct selectors across WhatsApp Web UI versions.
 */
export async function debugMessages(
  groupName: string,
  limit = 10,
): Promise<unknown> {
  if (!page || !ready) return { error: "Not ready" };
  return withPageLock(async () => {
    if (!page) return { error: "Not ready" };
    const p = page;
    await openChat(p, groupName);
    return p.evaluate(debugFn, limit);
  });
}

/**
 * Capture a screenshot of the current page (for QR code viewing remotely).
 * Returns a PNG buffer, or null if the page isn't available.
 */
export async function getScreenshot(): Promise<Buffer | null> {
  if (!page) return null;
  return withPageLock(async () => {
    if (!page) return null;
    return page.screenshot({ type: "png" }) as Promise<Buffer>;
  });
}

/**
 * Graceful shutdown. Goes through the same lock as every other page
 * operation so it waits for whatever's in-flight (a poll, a send, a
 * screenshot) instead of closing the context out from under it.
 */
export async function close(): Promise<void> {
  ready = false;
  await withPageLock(async () => {
    if (context) {
      await context.close().catch(() => {});
      context = null;
      page = null;
    }
  });
  console.log("[whatsapp] Browser closed.");
}
