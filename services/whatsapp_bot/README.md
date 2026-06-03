# WhatsApp Weather Bot

A WhatsApp bot that answers questions about current and historical conditions
from the station database, and broadcasts a daily morning forecast summary.

- **LLM:** OpenAI `gpt-4.1` (configurable via `OPENAI_MODEL`) with function
  calling. OpenAI applies automatic prompt caching to prompts over ~1024 tokens,
  so the system prompt is structured stable-first to maximise prefix reuse.
- **Transport:** WhatsApp Business **Cloud API** (Meta).
- **Data:** queries the same PostgreSQL `weather_readings` table as the web app;
  forecast comes from Open-Meteo.

## How it works

```
WhatsApp user ──▶ Meta Cloud API ──▶ POST /webhook ──▶ agent (gpt-4.1 + tools)
                                                          │  get_current_conditions
                                                          │  get_historical_summary   ──▶ PostgreSQL
                                                          │  get_forecast             ──▶ Open-Meteo
                                                          ▼
                            sendText() ◀── reply ◀────────┘

cron (08:00, configurable) ──▶ dailySummary ──▶ broadcast to DAILY_SUMMARY_RECIPIENTS
```

## Setup

1. **Create a Meta app** with the WhatsApp product. Note the **Phone Number ID**
   and a **permanent access token**.
2. **Expose the webhook publicly** (reverse proxy or tunnel to port 8080) and
   register `https://your-host/webhook` in the Meta dashboard, using the same
   string you set for `WHATSAPP_VERIFY_TOKEN`. Subscribe to the `messages` field.
3. Set the environment variables below (e.g. in the root `.env` consumed by
   docker-compose).

## Environment variables

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `OPENAI_API_KEY` | ✅ | — | OpenAI key |
| `OPENAI_MODEL` | | `gpt-4.1` | |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `STATION_ID` | | `jerago` | Filters `weather_readings` |
| `STATION_NAME` | | `Jerago con Orago, Italy` | Used in prompts |
| `STATION_LAT` / `STATION_LON` | | `45.71` / `8.79` | Forecast location |
| `WHATSAPP_TOKEN` | ✅ | — | Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | ✅ | — | Cloud API sender ID |
| `WHATSAPP_VERIFY_TOKEN` | ✅ | — | Arbitrary string; must match the value entered in the Meta dashboard |
| `WHATSAPP_API_VERSION` | | `v21.0` | Graph API version |
| `DAILY_SUMMARY_CRON` | | `0 8 * * *` | Cron expression for the broadcast |
| `DAILY_SUMMARY_RECIPIENTS` | | — | Comma-separated numbers, international format **without** `+` |
| `DAILY_SUMMARY_LANGUAGE` | | `English` | Language for the daily summary |
| `TZ` | | `Europe/Rome` | Timezone for the cron schedule |
| `PORT` | | `8080` | |

## Run

```bash
docker compose up --build whatsapp-bot
# or locally:
cd services/whatsapp_bot && npm install && npm start
```

## Caveats

- **24-hour window:** the Cloud API only allows free-form messages to a user
  within 24h of their last message. The daily broadcast therefore reaches users
  who have messaged recently; for cold outreach Meta requires an approved
  **message template** (not yet implemented here — failures are logged per
  recipient).
- Conversation history is kept **in memory** per sender (8 turns, 1h TTL); it
  resets on restart.
