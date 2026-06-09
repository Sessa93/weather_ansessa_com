import { chromium, type BrowserContext, type Page } from "playwright";
import { existsSync, mkdirSync } from "fs";
import { config } from "./config.js";

let context: BrowserContext | null = null;
let page: Page | null = null;
let ready = false;
let qrVisible = false;

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

/**
 * Send a text message to a specific group chat.
 *
 * @param groupName - The display name of the WhatsApp group
 * @param message - The text message to send
 */
export async function sendMessage(
  groupName: string,
  message: string,
): Promise<void> {
  if (!page || !ready) {
    throw new Error("WhatsApp Web is not ready yet.");
  }

  console.log(`[whatsapp] Sending message to "${groupName}"...`);

  // Click on the search/new-chat input
  const searchBox = page.locator('div[contenteditable="true"][data-tab="3"]');
  await searchBox.click();
  await searchBox.fill("");

  // Type the group name to search for it
  await searchBox.pressSequentially(groupName, { delay: 50 });

  // Wait for search results, then click the matching group
  await page.waitForTimeout(1500);

  const groupResult = page.locator(`span[title="${groupName}"]`).first();
  await groupResult.waitFor({ timeout: 10_000 });
  await groupResult.click();

  // Wait for the message input to appear
  const messageBox = page.locator(
    'div[contenteditable="true"][data-tab="10"], footer div[contenteditable="true"]',
  );
  await messageBox.waitFor({ timeout: 10_000 });
  await messageBox.click();

  // Type and send the message
  await messageBox.fill(message);
  await page.keyboard.press("Enter");

  // Brief wait to confirm send
  await page.waitForTimeout(1000);

  console.log(`[whatsapp] Message sent to "${groupName}".`);
}

/**
 * Capture a screenshot of the current page (for QR code viewing remotely).
 * Returns a PNG buffer, or null if the page isn't available.
 */
export async function getScreenshot(): Promise<Buffer | null> {
  if (!page) return null;
  return page.screenshot({ type: "png" }) as Promise<Buffer>;
}

/** Graceful shutdown. */
export async function close(): Promise<void> {
  ready = false;
  if (context) {
    await context.close().catch(() => {});
    context = null;
    page = null;
  }
  console.log("[whatsapp] Browser closed.");
}
