export interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
}

export async function fetchForecast(): Promise<DailyForecast[]> {
  // Coordinates for Jerago con Orago (approximate)
  const lat = process.env.STATION_LAT ?? "45.71";
  const lon = process.env.STATION_LON ?? "8.79";

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

  const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
  if (!res.ok) {
    throw new Error("Failed to fetch forecast");
  }

  const data = await res.json();
  
  return data.daily.time.map((time: string, index: number) => ({
    date: time,
    maxTemp: data.daily.temperature_2m_max[index],
    minTemp: data.daily.temperature_2m_min[index],
    weatherCode: data.daily.weather_code[index],
  }));
}

/**
 * Maps WMO Weather interpretation codes (WW) to human readable strings
 * https://open-meteo.com/en/docs
 */
export function getWeatherCondition(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1 || code === 2 || code === 3) return "Mainly clear, partly cloudy, and overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code === 51 || code === 53 || code === 55) return "Drizzle";
  if (code === 61 || code === 63 || code === 65) return "Rain";
  if (code === 71 || code === 73 || code === 75) return "Snow fall";
  if (code === 77) return "Snow grains";
  if (code === 80 || code === 81 || code === 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm with hail";
  return "Unknown";
}
