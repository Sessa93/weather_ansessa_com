import { config } from "./config.js";

export interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  condition: string;
}

/** Maps WMO weather interpretation codes to a human-readable condition. */
export function weatherCondition(code: number): string {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if ([96, 99].includes(code)) return "Thunderstorm with hail";
  return "Unknown";
}

/** Fetch the daily forecast from Open-Meteo for the station coordinates. */
export async function fetchForecast(days = 3): Promise<DailyForecast[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${config.stationLat}` +
    `&longitude=${config.stationLon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max` +
    `&timezone=auto&forecast_days=${days}`;

  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const timeoutMs = 10_000 * (attempt + 1); // 10s, 20s, 30s
      const res = await fetch(url, {
        headers: { "User-Agent": "weather-telegram-bot/1.0" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);

      const data = (await res.json()) as {
        daily?: {
          time: string[];
          weather_code: number[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_sum: number[];
          precipitation_probability_max: number[];
          wind_speed_10m_max: number[];
        };
      };
      const d = data.daily;
      if (!d?.time) throw new Error("Invalid forecast response");

      return d.time.map((date: string, i: number) => ({
        date,
        maxTemp: d.temperature_2m_max[i],
        minTemp: d.temperature_2m_min[i],
        precipitationSum: d.precipitation_sum[i],
        precipitationProbabilityMax: d.precipitation_probability_max[i],
        windSpeedMax: d.wind_speed_10m_max[i],
        condition: weatherCondition(d.weather_code[i]),
      }));
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = 2_000 * (attempt + 1);
        console.warn(
          `[forecast] Attempt ${attempt + 1} failed, retrying in ${delayMs / 1000}s:`,
          err instanceof Error ? err.message : err,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError;
}
