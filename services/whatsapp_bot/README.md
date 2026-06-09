# WhatsApp Bot (Playwright)

Headless-browser automation that sends messages to a WhatsApp group chat via WhatsApp Web. **Does not use the Meta Business API.**

## How it works

1. Playwright launches Chromium and opens `web.whatsapp.com`
2. On first run, a QR code appears — scan it with your phone
3. The browser session is persisted to a Docker volume (`whatsapp-auth`) so subsequent restarts skip QR scanning
4. An Express API exposes endpoints to send messages and check status

## First-time setup (QR authentication)

You need to scan the QR code once. The easiest way:

```bash
# Run locally with a visible browser window
cd services/whatsapp_bot
npm install
HEADLESS=false npm start
```

Scan the QR code with your phone, then Ctrl+C. The session is saved to `./auth/`.

For Docker, the auth state is stored in the `whatsapp-auth` volume. You can either:

- Run locally first (as above), then copy the `auth/` dir into the volume
- Or set `WHATSAPP_HEADLESS=false` and use VNC/X11 forwarding

## Docker Compose

```bash
# Start the whatsapp-bot (it's behind the "whatsapp" profile)
docker compose --profile whatsapp up -d whatsapp-bot
```

## API

### `GET /health`

```json
{ "ok": true, "ready": true, "qrVisible": false, "authenticated": true }
```

### `POST /send`

```bash
curl -X POST http://localhost:8085/send \
  -H "Content-Type: application/json" \
  -d '{"group": "My Weather Group", "message": "Hello from the bot!"}'
```

If `WHATSAPP_GROUP_NAME` is set, the `group` field is optional.

## Environment variables

| Variable              | Default      | Description                       |
| --------------------- | ------------ | --------------------------------- |
| `PORT`                | `8085`       | API server port                   |
| `WHATSAPP_GROUP_NAME` | (empty)      | Default group to send messages to |
| `HEADLESS`            | `true`       | Run Chromium headless             |
| `AUTH_DIR`            | `/data/auth` | Path to persist browser session   |
| `PAGE_LOAD_TIMEOUT`   | `60000`      | WhatsApp Web load timeout (ms)    |
