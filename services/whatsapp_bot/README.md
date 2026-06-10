# WhatsApp Bot (Playwright)

Headless-browser automation that connects the weather station to a WhatsApp group via WhatsApp Web. **Does not use the Meta Business API.**

Feature parity with the Telegram bot:

- **AI assistant** — group members can ask weather questions (current conditions, history, forecast) by prefixing a message with the trigger (default `@meteo`). An LLM agent with database/forecast tools answers in Italian, with per-sender conversation memory.
- **`@meteo previsioni`** — today's forecast summary on demand (same as Telegram's `/previsioni`).
- **Daily summary** — an LLM-written morning forecast is broadcast to the configured groups on a cron schedule (default 08:00).
- **Weather alerts** — every 5 minutes the latest reading is checked against thresholds (extreme heat, freeze, high wind, heavy rain, low pressure) and new alerts are broadcast.
- **HTTP API** — `POST /send` for arbitrary messages, `GET /qr` for remote QR authentication.

## How it works

1. Playwright launches Chromium and opens `web.whatsapp.com`
2. On first run, a QR code appears — scan it with your phone
3. The browser session is persisted to a Docker volume (`whatsapp-auth`) so subsequent restarts skip QR scanning
4. The bot keeps the configured group open and polls it for new incoming messages; replies and broadcasts are typed into the chat

## First-time setup (QR authentication)

You need to scan the QR code once. The easiest way:

```bash
# Run locally with a visible browser window
cd services/whatsapp_bot
npm install
HEADLESS=false OPENAI_API_KEY=... DATABASE_URL=... npm start
```

Scan the QR code with your phone, then Ctrl+C. The session is saved to `./auth/`.

For Docker, the auth state is stored in the `whatsapp-auth` volume. You can either:

- Run locally first (as above), then copy the `auth/` dir into the volume
- Or open `http://localhost:8085/qr` in a browser and scan the rendered QR

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
{ "ok": true, "ready": true, "qrVisible": false, "authenticated": true }
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

## Environment variables

| Variable               | Default                   | Description                                          |
| ---------------------- | ------------------------- | ---------------------------------------------------- |
| `PORT`                 | `8085`                    | API server port                                      |
| `WHATSAPP_GROUP_NAME`  | (empty)                   | Group the bot listens to and replies in              |
| `TRIGGER_PREFIX`       | `@meteo`                  | Prefix that triggers the assistant (case-insensitive)|
| `POLL_INTERVAL_MS`     | `3000`                    | How often the open chat is polled for new messages   |
| `OPENAI_API_KEY`       | (required)                | OpenAI key for the agent and summaries               |
| `OPENAI_MODEL`         | `gpt-4.1`                 | OpenAI model                                         |
| `DATABASE_URL`         | (required)                | PostgreSQL with `weather_readings`                   |
| `STATION_NAME`         | `Jerago con Orago, Italy` | Station display name                                 |
| `STATION_LAT`/`_LON`   | `45.71` / `8.79`          | Coordinates for the Open-Meteo forecast              |
| `DAILY_SUMMARY_CRON`   | `0 8 * * *`               | Cron for the morning summary                         |
| `DAILY_SUMMARY_GROUPS` | `WHATSAPP_GROUP_NAME`     | Comma-separated groups for summaries and alerts      |
| `TZ`                   | `Europe/Rome`             | Timezone for crons and timestamps                    |
| `HEADLESS`             | `true`                    | Run Chromium headless                                |
| `AUTH_DIR`             | `/data/auth`              | Path to persist browser session                      |
| `PAGE_LOAD_TIMEOUT`    | `60000`                   | WhatsApp Web load timeout (ms)                       |
