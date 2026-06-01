# Weather Station Dashboard

A modern weather dashboard for Davis WeatherLink-compatible stations. It features real-time monitoring, historical data visualization, and automated data ingestion.

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
3. Create a `.env` file in that directory with your production values (`OPENAI_API_KEY`, `STATION_URL`, etc.).
4. Log in to GHCR on the droplet so it can pull images:
   ```bash
   # Create a GitHub PAT with read:packages scope, then:
   echo "YOUR_PAT" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
   ```

GitHub configuration:

1. Add repository secrets:
   - `DO_DROPLET_HOST`: droplet IP address or hostname.
   - `DO_DROPLET_USER`: SSH user used for deployment.
   - `DO_DROPLET_SSH_KEY`: private SSH key GitHub Actions uses to connect to the droplet.
2. Optionally add repository variables:
   - `DO_DEPLOY_PATH`: remote directory. Defaults to `/opt/weather_ansessa_com`.
   - `DO_DROPLET_SSH_PORT`: SSH port. Defaults to `22`.

Operational notes:

- No git checkout is needed on the droplet. The workflow copies `docker-compose.yml` and config files via SCP, then pulls the pre-built image from GHCR.
- `data/` (Postgres volume) and `.env` persist on the droplet across deploys.
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
├── app/                # Next.js App Router (pages and API)
│   ├── api/            # API endpoints (ingest, current, records, etc.)
│   ├── components/     # Reusable React components
│   ├── graphs/         # Visualizations and charts
│   ├── records/        # Historical records and climatology
│   ├── about/          # Project information page
│   └── page.tsx        # Main dashboard
├── data/               # Persistent PostgreSQL data (Docker volume)
├── lib/                # Shared utilities and server-side logic
│   ├── db.ts           # PostgreSQL client
│   ├── ingest.ts       # Logic for fetching and storing station data
│   ├── schema.sql      # Database schema definitions
│   ├── station.ts      # Weather station API client
│   └── ...
├── public/             # Static assets (images, icons)
├── instrumentation.ts  # Background worker for periodic data ingestion
├── Dockerfile          # Multi-stage build for production
└── docker-compose.yml  # Orchestration for app and database
```

## 🧪 Tests

- TODO: Add unit and integration tests (e.g., Vitest, Playwright).

## 📄 License

- TODO: Add LICENSE file.
