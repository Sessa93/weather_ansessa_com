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

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/weather` |
| `STATION_URL` | Base URL of the weather station (WeatherLink-compatible API) | `http://localhost:8888` |
| `OPENAI_API_KEY` | OpenAI API Key for weather summaries | (Required for AI features) |
| `INGEST_INTERVAL_MS` | Frequency of background data ingestion in milliseconds | `600000` (10 minutes) |
| `INGEST_SECRET` | Optional bearer token to protect the `/api/ingest` endpoint | - |
| `MARIADB_HOST` | Host for WeeWX import (MariaDB) | `127.0.0.1` |
| `MARIADB_PORT` | Port for WeeWX import | `3306` |
| `MARIADB_USER` | Username for WeeWX import | `weewx` |
| `MARIADB_PASS` | Password for WeeWX import | `weewx` |
| `MARIADB_DB` | Database name for WeeWX import | `weewxdb` |

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
docker-compose up -d
```

The app will be available at [http://localhost:8083](http://localhost:8083).

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Starts the development server with hot-reloading. |
| `npm run build` | Builds the application for production. |
| `npm run start` | Starts the production server. |
| `npm run lint` | Runs ESLint to check for code quality issues. |
| `npm run db:seed` | Seeds the database with mock historical data for development. |
| `npm run db:import-weewx` | Imports historical data from a WeeWX MariaDB database. |

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
