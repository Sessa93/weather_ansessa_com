# WhatsApp Bot (Playwright)

Headless-browser automation that connects the weather station to a WhatsApp group via WhatsApp Web. **Does not use the Meta Business API.**

Feature parity with the Telegram bot:

- **AI assistant** — group members can ask weather questions (current conditions, history, forecast) by prefixing a message with the trigger (default `@meteo`). An LLM agent with database/forecast tools answers in Italian, with per-sender conversation memory.
- **`@meteo previsioni`** — today's forecast summary on demand (same as Telegram's `/previsioni`).
- **Daily summary** — an LLM-written morning message is broadcast to the configured groups on a cron schedule (default 08:00). It includes a **recap of yesterday's actuals** (from the station database: min/max temperature, total rain, wind) followed by **today's forecast**.
- **Weather alerts** — every 5 minutes the latest reading is checked against thresholds (extreme heat, freeze, high wind, heavy rain, low pressure) and new alerts are broadcast.
- **HTTP API** — `POST /send` for arbitrary messages, `POST /daily-summary` to retrigger the morning broadcast, `GET /code` / `GET /qr` for remote authentication.

## How it works

1. Playwright launches Chromium and opens `web.whatsapp.com`
2. On first run the device must be linked — by **pairing code** (preferred) or QR (see below)
3. The browser session is persisted to a Docker volume (`whatsapp-auth`) so subsequent restarts skip authentication
4. The bot keeps the configured group open and polls it for new incoming messages; replies and broadcasts are typed into the chat

## First-time setup (authentication)

### Pairing code (recommended — no QR scan)

Set `WHATSAPP_PHONE_NUMBER` to the linked phone's number in international format,
digits only (e.g. `393331234567`). On startup the bot enters that number into
WhatsApp Web and obtains an 8-character linking code. Read it from:

- the container logs (`PAIRING CODE: XXXX-XXXX`), or
- `GET http://localhost:8085/code`

Then on the phone: **Settings → Linked devices → Link a device → "Link with
phone number instead"**, and enter the code. The session is saved to the
`whatsapp-auth` volume, so this is a one-time step.

### QR code (fallback)

Leave `WHATSAPP_PHONE_NUMBER` empty to use QR instead. Either run locally with a
visible browser (`HEADLESS=false … npm start`) and scan it, or open
`http://localhost:8085/qr` to scan the rendered QR remotely.

## Docker Compose

```bash
docker compose up -d whatsapp-bot
```

## Talking to the bot

In the configured group, prefix a message with the trigger:

> @meteo che tempo fa?
>
> @meteo quanta pioggia è caduta ieri?
>
> @meteo previsioni

Messages without the prefix are ignored.

## API

### `GET /health`

```json
{ "ok": true, "version": "0.2.8", "ready": true, "qrVisible": false, "authenticated": true }
```

### `GET /debug/messages?group=<name>`

Returns the raw DOM data (attributes tried, extracted text) for the last 10
message rows in `group` (defaults to `WHATSAPP_GROUP_NAME`). For diagnosing
selector breakage when WhatsApp Web's markup changes.

### `GET /screenshot`

Returns a PNG screenshot of the current page — the same image `/qr` serves,
but without the "already authenticated" short-circuit, so it also works to
see what the bot's session looks like after login.

### `GET /code`

Returns the pairing code for phone-number authentication when one is pending:

```json
{ "ok": true, "code": "ABCD-1234", "instructions": "On your phone: …" }
```

### `GET /qr`

Returns a PNG screenshot of the QR code when authentication is pending.

### `POST /send`

```bash
curl -X POST http://localhost:8085/send \
  -H "Content-Type: application/json" \
  -d '{"group": "My Weather Group", "message": "Hello from the bot!"}'
```

If `WHATSAPP_GROUP_NAME` is set, the `group` field is optional.

### `POST /daily-summary`

Manually triggers the morning summary broadcast (yesterday's recap + today's
forecast) to all configured groups — the same action the cron runs.

```bash
curl -X POST http://localhost:8085/daily-summary
```

```json
{ "ok": true, "groups": ["Famiglia"] }
```

## Environment variables

| Variable                | Default                   | Description                                           |
| ----------------------- | ------------------------- | ----------------------------------------------------- |
| `PORT`                  | `8085`                    | API server port                                       |
| `WHATSAPP_GROUP_NAME`   | (empty)                   | Group the bot listens to and replies in               |
| `WHATSAPP_PHONE_NUMBER` | (empty)                   | Linked phone, intl digits; empty = use QR instead     |
| `TRIGGER_PREFIX`        | `@meteo`                  | Prefix that triggers the assistant (case-insensitive) |
| `BOT_NAME`              | `Meteo Jerago Bot`        | Signature prepended to every outgoing message         |
| `POLL_INTERVAL_MS`      | `3000`                    | How often the open chat is polled for new messages    |
| `OPENAI_API_KEY`        | (required)                | OpenAI key for the agent and summaries                |
| `OPENAI_MODEL`          | `gpt-4.1`                 | OpenAI model                                          |
| `DATABASE_URL`          | (required)                | PostgreSQL with `weather_readings`                    |
| `STATION_NAME`          | `Jerago con Orago, Italy` | Station display name                                  |
| `STATION_LAT`/`_LON`    | `45.71` / `8.79`          | Coordinates for the Open-Meteo forecast               |
| `DAILY_SUMMARY_CRON`    | `0 8 * * *`               | Cron for the morning summary                          |
| `DAILY_SUMMARY_GROUPS`  | `WHATSAPP_GROUP_NAME`     | Comma-separated groups for summaries and alerts       |
| `TZ`                    | `Europe/Rome`             | Timezone for crons and timestamps                     |
| `HEADLESS`              | `true`                    | Run Chromium headless                                 |
| `REMOTE_DEBUG_PORT`     | `9222`                    | Expose CDP on this port (0 disables); see below       |
| `AUTH_DIR`              | `/data/auth`              | Path to persist browser session                       |
| `PAGE_LOAD_TIMEOUT`     | `60000`                   | WhatsApp Web load timeout (ms)                        |

## Interactive debugging (CDP)

When `REMOTE_DEBUG_PORT` is set (default `9222`, exposed by docker-compose), the
headless Chromium also serves the Chrome DevTools Protocol. You can attach a
real DevTools session to **see and click the live page** — useful to complete
WhatsApp login by hand or to dismiss popups when selectors drift:

1. In your local Chrome, open `chrome://inspect`.
2. Click **Configure…** next to "Discover network targets" and add
   `HOST:9222` (e.g. `100.86.21.32:9222`).
3. The WhatsApp Web page appears under "Remote Target" — click **inspect** to
   open an interactive DevTools window with a clickable screencast.

Notes:

- Chrome only accepts remote-debugging connections whose `Host` header is an IP
  literal (like a tailnet address) or localhost — use the IP, not a hostname.
- This endpoint is unauthenticated; only expose it on a trusted network
  (e.g. tailnet). Set `REMOTE_DEBUG_PORT=0` to disable it.
- Once logged in, the session persists to the `whatsapp-auth` volume, so you can
  disable CDP again afterwards.
