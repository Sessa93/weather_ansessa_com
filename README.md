# Weather Station Dashboard

A modern weather dashboard for Davis WeatherLink-compatible stations. It features real-time monitoring, historical data visualization, weather alerts, and automated data ingestion.

## 🏗 Architecture

```mermaid
graph TB
    subgraph External["External Services"]
        DAVIS["🌡 Davis WeatherLink<br/>Station API"]
        OPENMETEO["🌤 Open-Meteo<br/>Forecast API"]
        OPENAI["🤖 OpenAI<br/>GPT-4"]
        BLITZ["⚡ Blitzortung<br/>Lightning API"]
    end

    subgraph Docker["Docker Compose Stack"]
        subgraph NextJS["Next.js App :8083"]
            PROXY["proxy.ts<br/>Access Logging"]
            INGEST["instrumentation.ts<br/>Background Ingester"]
            SSR["SSR Pages<br/>/ /graphs /records /reports /about"]
            API["API Routes<br/>/api/current /api/readings<br/>/api/forecast /api/records<br/>/api/alerts /api/lightning<br/>/api/climate-report ..."]
            LIVE["SSE Endpoint<br/>/api/live"]
            MQTT_SUB["MQTT Subscriber"]
        end

        PG[("PostgreSQL 16<br/>weather_readings<br/>daily_records<br/>all_time_records")]

        subgraph Mosquitto["Eclipse Mosquitto :1883"]
            MQTT_BROKER["MQTT Broker"]
        end

        subgraph UDPListener["UDP Listener :22222"]
            UDP["Rust Service<br/>Davis UDP → MQTT"]
        end

        subgraph TelegramBot["Telegram Bot :8084"]
            BOT["Grammy Bot<br/>AI Agent (OpenAI)<br/>Alert Checker<br/>Daily Summary Cron"]
        end

        subgraph VirtualStation["Virtual Station :8888"]
            SIM["Simulator<br/>(profile: simulator)"]
        end
    end

    subgraph Clients["Clients"]
        BROWSER["🌐 Browser / PWA"]
        TG["📱 Telegram"]
    end

    %% Data flow
    DAVIS -- "HTTP poll<br/>every 10 min" --> INGEST
    DAVIS -- "UDP live<br/>every 2.5s" --> UDP
    SIM -. "HTTP + UDP<br/>(dev mode)" .-> INGEST
    SIM -. "UDP" .-> UDP
    UDP -- "MQTT publish<br/>weather/live" --> MQTT_BROKER
    MQTT_BROKER -- "subscribe" --> MQTT_SUB
    MQTT_SUB -- "push" --> LIVE
    INGEST -- "INSERT" --> PG
    API -- "SELECT" --> PG
    BOT -- "SELECT" --> PG
    SSR -- "fetch" --> API
    OPENMETEO -- "forecast" --> API
    OPENAI -- "summaries" --> API
    OPENAI -- "agent tools" --> BOT
    BLITZ -- "strikes" --> API
    BROWSER -- "HTTP/SSE" --> PROXY --> SSR
    BROWSER -- "SSE" --> LIVE
    TG -- "messages" --> BOT
    BOT -- "alerts/summaries" --> TG
```

### Data Flow

1. **Ingestion** — The Next.js background worker (`instrumentation.ts`) polls the Davis station HTTP API every 10 minutes and stores readings in PostgreSQL. On failure, it backs off exponentially up to 60 minutes.
2. **Real-time** — The station broadcasts UDP packets every 2.5s. A Rust `udp-listener` converts these to MQTT messages. The Next.js app subscribes and pushes updates to browsers via Server-Sent Events (SSE).
3. **API** — Route handlers query PostgreSQL for current conditions, time-series readings, records, climatology, and alerts. Forecast and lightning data come from external APIs.
4. **Telegram Bot** — An independent Node.js service with a GPT-4 AI agent that answers weather questions via function calling, sends daily summary broadcasts, and checks for weather alert thresholds every 5 minutes.
5. **Frontend** — A PWA built with Next.js App Router, Recharts, and Tailwind CSS. Supports service worker caching, push notifications, and real-time updates.

## ✨ Features

- **Real-time conditions** — live temperature, humidity, wind compass, barometer with 3-hour pressure trend sparkline
- **Weather alerts** — threshold-based banners for extreme heat, freezing, high wind, heavy rain, and low pressure
- **Interactive charts** — temperature, wind, rain, barometer, humidity, and wind rose with day/week/month/year ranges
- **Historical comparison** — overlay last year's temperature data on the current chart
- **Heatmap calendar** — GitHub-style year-at-a-glance view for temperature, rain, or humidity
- **Lightning tracker** — nearby strike detection via Blitzortung with mini radar visualization
- **Data export** — download readings as CSV or JSON for any time range
- **AI weather summaries** — GPT-powered daily summaries with in-memory caching
- **7-day forecast** — Open-Meteo integration with localized conditions
- **PWA support** — installable as a mobile/desktop app with offline caching
- **Dynamic OG images** — auto-generated social share cards with current conditions
- **Localization** — full Italian and English support (i18n)
- **Multi-station ready** — schema supports multiple stations with per-station data isolation
- **CI/CD** — GitHub Actions builds and deploys to a DigitalOcean droplet via GHCR

## 🚀 Tech Stack

- **Framework**: [Next.js 16.2.6](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Runtime & Package Manager**: [Bun](https://bun.sh/) (preferred for production) or [Node.js](https://nodejs.org/) + [npm](https://www.npmjs.com/)
- **Database**: [PostgreSQL 16](https://www.postgresql.org/) (Main store), [MariaDB](https://mariadb.org/) (Source for WeeWX import)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Visualization**: [Recharts](https://recharts.org/)
- **AI Integration**: [OpenAI](https://openai.com/) (for weather analysis/summaries)

## 📋 Requirements

- **Local Development**:
  - Node.js 20+ or Bun 1.0+
  - PostgreSQL 16+
- **Docker Deployment**:
  - Docker and Docker Compose

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory and configure the following:

| Variable             | Description                                                  | Default                                                 |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string                                 | `postgresql://postgres:postgres@localhost:5432/weather` |
| `STATION_URL`        | Base URL of the weather station (WeatherLink-compatible API) | `http://localhost:8888`                                 |
| `OPENAI_API_KEY`     | OpenAI API Key for weather summaries                         | (Required for AI features)                              |
| `INGEST_INTERVAL_MS` | Frequency of background data ingestion in milliseconds       | `600000` (10 minutes)                                   |
| `INGEST_SECRET`      | Optional bearer token to protect the `/api/ingest` endpoint  | -                                                       |
| `STATION_LAT`        | Latitude of the station for forecast                         | `45.71`                                                 |
| `STATION_LON`        | Longitude of the station for forecast                        | `8.79`                                                  |
| `STATION_ALTITUDE`   | Altitude of the station in metres                            | `330`                                                   |
| `MARIADB_HOST`       | Host for WeeWX import (MariaDB)                              | `127.0.0.1`                                             |
| `MARIADB_PORT`       | Port for WeeWX import                                        | `3306`                                                  |
| `MARIADB_USER`       | Username for WeeWX import                                    | `weewx`                                                 |
| `MARIADB_PASS`       | Password for WeeWX import                                    | `weewx`                                                 |
| `MARIADB_DB`         | Database name for WeeWX import                               | `weewxdb`                                               |

## 🛠 Setup & Run

### Local Development

1. **Install dependencies**:

   ```bash
   npm install
   # or
   bun install
   ```

2. **Initialize Database**:
   Ensure PostgreSQL is running and the database exists. You can use the schema provided in `lib/schema.sql`.

3. **Run the development server**:

   ```bash
   npm run dev
   # or
   bun dev
   ```

4. **Access the dashboard**:
   Open [http://localhost:3000](http://localhost:3000)

### Docker Deployment

The project is optimized for Docker using `docker-compose`.

```bash
# Start the entire stack (App + DB)
# Use --build to ensure latest code changes are included
docker-compose up -d --build
```

The app will be available at [http://localhost:8083](http://localhost:8083).

### GitHub Actions Deployment to a DigitalOcean Droplet

A GitHub Actions workflow at `.github/workflows/deploy-droplet.yml` builds the app Docker image, pushes it to GitHub Container Registry (GHCR), then SSHes into the droplet to pull the new image and restart the containers. The workflow runs on every push to `main` and can also be triggered manually.

One-time droplet setup:

1. Install Docker and Docker Compose on the droplet.
2. Create the deploy directory (default `/opt/weather_ansessa_com`).
3. Log in to GHCR on the droplet so it can pull images:
   ```bash
   # Create a GitHub PAT with read:packages scope, then:
   echo "YOUR_PAT" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
   ```

GitHub configuration (all scoped to the `production` environment):

1. Add **environment secrets**:
   - `DO_DROPLET_HOST`: droplet IP address or hostname.
   - `DO_DROPLET_USER`: SSH user used for deployment.
   - `DO_DROPLET_SSH_KEY`: private SSH key GitHub Actions uses to connect to the droplet.
   - `OPENAI_API_KEY`: OpenAI API key for weather summaries.
   - `INGEST_SECRET` _(optional)_: bearer token to protect `/api/ingest`.
2. Add **environment variables**:
   - `STATION_URL`: base URL of the weather station.
   - `STATION_LAT`: station latitude (default `45.71`).
   - `STATION_LON`: station longitude (default `8.79`).
   - `STATION_ALTITUDE`: station altitude in metres (default `330`).
   - `INGEST_INTERVAL_MS`: ingestion frequency in ms (default `600000`).
   - `OPENAI_MODEL`: model name (default `gpt-4o-mini`).
   - `DO_DEPLOY_PATH` _(optional)_: remote directory (default `/opt/weather_ansessa_com`).
   - `DO_DROPLET_SSH_PORT` _(optional)_: SSH port (default `22`).

Operational notes:

- No git checkout or manual `.env` file is needed on the droplet. The workflow generates a `.env` from GitHub environment secrets/variables and SCPs it alongside `docker-compose.yml` and config files.
- `data/` (Postgres volume) persists on the droplet across deploys.
- Each deploy is also tagged with the commit SHA (`ghcr.io/sessa93/weather_ansessa_com:<sha>`) for rollback.
- You can trigger the workflow manually from the GitHub Actions tab with `workflow_dispatch`.

### Virtual Station Simulator

For testing without the physical Davis station, a WeatherLink-compatible simulator is available as a Compose profile.

```bash
# Run the full simulator path for local `npm run dev`
docker compose --profile simulator up -d --build mosquitto udp-listener virtual-station

# Or run the full stack plus the simulator
docker compose --profile simulator up -d --build postgres mosquitto udp-listener app virtual-station
```

The simulator exposes the same HTTP surface the app already uses:

- `GET /v1/current_conditions`
- `GET /v1/real_time?duration=300`

By default it listens on [http://localhost:8888](http://localhost:8888), which matches the existing local `STATION_URL` default. When `/v1/real_time` is called, it also starts sending Davis-style UDP packets to port `22222` so the existing `udp-listener` and MQTT live updates continue to work.

If you only need the HTTP polling surface, you can start just `virtual-station`, but the full command above is what reproduces the real station + live MQTT path.

Optional simulator environment variables:

| Variable                    | Description                                               | Default        |
| --------------------------- | --------------------------------------------------------- | -------------- |
| `SIM_STATION_PORT`          | Host port published by the simulator container            | `8888`         |
| `SIM_UDP_TARGET_HOST`       | Hostname/IP that should receive the simulated UDP packets | `udp-listener` |
| `SIM_UDP_TARGET_PORT`       | UDP port for the simulated live packets                   | `22222`        |
| `SIM_BROADCAST_INTERVAL_MS` | Interval between UDP live packets                         | `1000`         |
| `SIM_SCENARIO`              | Weather pattern: `variable`, `storm`, or `calm`           | `variable`     |

The `udp-listener` service also publishes `22222/udp` on the host, so real Davis broadcasts from your LAN can still be forwarded into the container outside simulator-based testing.

## 📜 Scripts

| Script                    | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| `npm run dev`             | Starts the development server with hot-reloading.             |
| `npm run build`           | Builds the application for production.                        |
| `npm run start`           | Starts the production server.                                 |
| `npm run lint`            | Runs ESLint to check for code quality issues.                 |
| `npm run db:seed`         | Seeds the database with mock historical data for development. |
| `npm run db:import-weewx` | Imports historical data from a WeeWX MariaDB database.        |

## 📁 Project Structure

```text
├── app/                    # Next.js App Router (pages and API)
│   ├── api/                # API endpoints
│   │   ├── alerts/         # Threshold-based weather alerts
│   │   ├── climatology/    # Monthly climate normals
│   │   ├── current/        # Current conditions
│   │   ├── day-summary/    # GPT-powered daily summary
│   │   ├── export/         # CSV/JSON data export
│   │   ├── forecast/       # 7-day Open-Meteo forecast
│   │   ├── heatmap/        # Daily aggregates for heatmap
│   │   ├── ingest/         # Weather station data ingestion
│   │   ├── lightning/      # Blitzortung lightning proxy
│   │   ├── live/           # WebSocket live readings
│   │   ├── pressure-trend/ # 3-hour barometer history
│   │   ├── rain-by-month/  # Monthly rain totals
│   │   ├── readings/       # Historical readings
│   │   ├── readings-compare/ # Same period last year
│   │   ├── records/        # All-time and daily records
│   │   ├── start-live/     # Start live MQTT bridge
│   │   └── stations/       # Station registry
│   ├── components/         # React components
│   │   ├── ClimatologyChart.tsx
│   │   ├── CurrentConditions.tsx
│   │   ├── DaySummary.tsx
│   │   ├── Forecast.tsx
│   │   ├── HeatmapCalendar.tsx
│   │   ├── HomeCharts.tsx
│   │   ├── LightningTracker.tsx
│   │   ├── MonthlyRainChart.tsx
│   │   ├── RecordSnapshots.tsx
│   │   ├── WeatherAlerts.tsx
│   │   ├── WeatherCharts.tsx
│   │   ├── WindRose.tsx
│   │   └── WindyRadar.tsx
│   ├── graphs/             # Charts page with export & compare
│   ├── records/            # Records & climatology page
│   ├── about/              # About page
│   └── page.tsx            # Main dashboard
├── lib/                    # Shared utilities and server-side logic
│   ├── db.ts               # PostgreSQL client
│   ├── i18n.ts             # Localization (IT/EN)
│   ├── ingest.ts           # Station data ingestion logic
│   ├── schema.sql          # Database schema
│   ├── station.ts          # WeatherLink API client
│   ├── types.ts            # TypeScript interfaces
│   └── migrations/         # SQL migrations
├── public/                 # Static assets
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
├── services/               # Sidecar services
│   ├── mosquitto/          # MQTT broker config
│   └── udp_listener/       # Rust UDP→MQTT bridge
├── instrumentation.ts      # Background ingestion worker
├── Dockerfile              # Multi-stage production build
└── docker-compose.yml      # Full stack orchestration
```

## 🧪 Tests

- TODO: Add unit and integration tests (e.g., Vitest, Playwright).

## 📄 License

- TODO: Add LICENSE file.
