import type OpenAI from "openai";
import { pool } from "./db.js";
import { config } from "./config.js";
import { fetchForecast } from "./forecast.js";

const SUMMARY_AGGREGATES = `
  MIN(outside_temp) temp_min, MAX(outside_temp) temp_max, AVG(outside_temp) temp_avg,
  MIN(humidity) hum_min, MAX(humidity) hum_max, AVG(humidity) hum_avg,
  AVG(wind_speed) wind_avg, MAX(wind_gust) wind_gust_max,
  SUM(rain) rain_total, MAX(rain_rate) rain_rate_max,
  MIN(barometer) baro_min, MAX(barometer) baro_max,
  COUNT(*) n`;

interface SummaryRow {
  temp_min: number | null;
  temp_max: number | null;
  temp_avg: number | null;
  hum_min: number | null;
  hum_max: number | null;
  hum_avg: number | null;
  wind_avg: number | null;
  wind_gust_max: number | null;
  rain_total: number | null;
  rain_rate_max: number | null;
  baro_min: number | null;
  baro_max: number | null;
  n: string;
}

function shapeSummary(s: SummaryRow) {
  return {
    samples: Number(s.n),
    temperature_c: {
      min: round(s.temp_min),
      max: round(s.temp_max),
      avg: round(s.temp_avg),
    },
    humidity_pct: {
      min: round(s.hum_min, 0),
      max: round(s.hum_max, 0),
      avg: round(s.hum_avg, 0),
    },
    wind_kmh: { avg: round(s.wind_avg), max_gust: round(s.wind_gust_max) },
    rain_mm: {
      total: round(s.rain_total, 2),
      max_rate_mmh: round(s.rain_rate_max, 2),
    },
    barometer_mbar: { min: round(s.baro_min), max: round(s.baro_max) },
  };
}

/**
 * Aggregate one calendar day's actuals in the station timezone.
 * `offsetDays` counts back from today (1 = yesterday). Returns null if the day
 * has no readings.
 */
export async function summarizeDay(
  offsetDays: number,
): Promise<ReturnType<typeof shapeSummary> | null> {
  const { rows } = await pool.query<SummaryRow>(
    `SELECT ${SUMMARY_AGGREGATES}
     FROM weather_readings
     WHERE (timestamp AT TIME ZONE $1)::date
           = ((NOW() AT TIME ZONE $1)::date - $2::int)`,
    [config.timezone, offsetDays],
  );
  const s = rows[0];
  if (!s || Number(s.n) === 0) return null;
  return shapeSummary(s);
}

/** OpenAI function-tool schemas exposed to the model. */
export const toolDefinitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_current_conditions",
      description:
        "Get the most recent live weather reading from the station " +
        "(temperature, humidity, wind, barometer, rain, dew point). " +
        "Use for questions about conditions right now.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_historical_summary",
      description:
        "Get aggregated weather statistics (min/max/avg temperature and humidity, " +
        "total rain, peak wind gust, pressure range) over a time range. Use for " +
        "questions about today, yesterday, last week, a specific date, or any time period. " +
        "Always include the UTC offset in timestamps (e.g. 2026-06-05T00:00:00+02:00). " +
        "The range is inclusive of start, exclusive of end.",
      parameters: {
        type: "object",
        properties: {
          start: {
            type: "string",
            description:
              "Start of the range, ISO 8601 (e.g. 2026-06-01T00:00:00).",
          },
          end: {
            type: "string",
            description: "End of the range (exclusive), ISO 8601.",
          },
        },
        required: ["start", "end"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_forecast",
      description:
        "Get the upcoming daily weather forecast (max/min temperature, precipitation, " +
        "wind, condition) for the next few days from Open-Meteo.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "integer",
            description: "Number of days to forecast (1-7). Defaults to 3.",
          },
        },
        additionalProperties: false,
      },
    },
  },
];

const round = (v: number | null, d = 1): number | null =>
  v == null ? null : Number(v.toFixed(d));

async function getCurrentConditions(): Promise<unknown> {
  const { rows } = await pool.query(
    `SELECT timestamp, outside_temp, feels_like, dew_point, humidity,
            wind_speed, wind_gust, wind_dir, barometer, rain, rain_rate,
            wind_chill, heat_index
     FROM weather_readings
     WHERE outside_temp IS NOT NULL
     ORDER BY timestamp DESC LIMIT 1`,
  );
  if (rows.length === 0) return { error: "No readings available." };
  const r = rows[0];
  return {
    timestamp: r.timestamp,
    temperature_c: round(r.outside_temp),
    feels_like_c: round(r.feels_like),
    dew_point_c: round(r.dew_point),
    humidity_pct: round(r.humidity, 0),
    wind_speed_kmh: round(r.wind_speed),
    wind_gust_kmh: round(r.wind_gust),
    wind_dir_deg: round(r.wind_dir, 0),
    barometer_mbar: round(r.barometer),
    rain_mm: round(r.rain, 2),
    rain_rate_mmh: round(r.rain_rate, 2),
    wind_chill_c: round(r.wind_chill),
    heat_index_c: round(r.heat_index),
  };
}

async function getHistoricalSummary(args: {
  start: string;
  end: string;
}): Promise<unknown> {
  const { rows } = await pool.query<SummaryRow>(
    `SELECT ${SUMMARY_AGGREGATES}
     FROM weather_readings
     WHERE timestamp >= $1 AND timestamp < $2`,
    [args.start, args.end],
  );
  const s = rows[0];
  if (!s || Number(s.n) === 0) {
    return {
      error: "No data for the requested range.",
      start: args.start,
      end: args.end,
    };
  }
  return { range: { start: args.start, end: args.end }, ...shapeSummary(s) };
}

async function getForecast(args: { days?: number }): Promise<unknown> {
  const days = Math.min(Math.max(args.days ?? 3, 1), 7);
  return { forecast: await fetchForecast(days) };
}

/** Dispatch a tool call by name. Returns a JSON-serialisable result. */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "get_current_conditions":
      return getCurrentConditions();
    case "get_historical_summary":
      return getHistoricalSummary(args as { start: string; end: string });
    case "get_forecast":
      return getForecast(args as { days?: number });
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
