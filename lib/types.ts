export interface Station {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  elevation_m: number | null;
}

export interface WeatherReading {
  id: number;
  station_id: string;
  timestamp: string;
  outside_temp: number | null;
  feels_like: number | null;
  dew_point: number | null;
  humidity: number | null;
  wind_speed: number | null;
  wind_gust: number | null;
  wind_dir: number | null;
  barometer: number | null;
  rain: number | null;
  rain_rate: number | null;
  wind_chill: number | null;
  heat_index: number | null;
}

export interface DailyRecord {
  date: string;
  high_temp: number;
  low_temp: number;
  avg_wind: number;
  high_wind: number;
  total_rain: number;
  high_rain_rate: number;
}

export interface AllTimeRecord {
  label: string;
  current_year_value: string;
  current_year_date: string;
  all_time_value: string;
  all_time_date: string;
}

export interface ForecastHour {
  time: string;
  temp: number;
  precip_chance: number;
  wind_speed: number;
  icon: string;
  condition: string;
}

export interface CurrentConditions {
  timestamp: string;
  temp: number | null;
  feels_like: number | null;
  condition: string;
  icon: string;
  high: number | null;
  high_recorded_at: string | null;
  low: number | null;
  low_recorded_at: string | null;
  wind_speed: number | null;
  wind_gust: number | null;
  wind_dir: number | null;
  barometer: number | null;
  dew_point: number | null;
  humidity: number | null;
  rain_today: number | null;
  rain_rate: number | null;
  sunrise: string;
  sunset: string;
  moon_phase: string;
  moon_visible: number;
}
