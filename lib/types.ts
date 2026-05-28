export interface WeatherReading {
  id: number;
  timestamp: string;
  outside_temp: number;
  feels_like: number;
  dew_point: number;
  humidity: number;
  wind_speed: number;
  wind_gust: number;
  wind_dir: number;
  barometer: number;
  rain: number;
  rain_rate: number;
  wind_chill: number;
  heat_index: number;
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
  temp: number;
  feels_like: number;
  condition: string;
  icon: string;
  high: number;
  low: number;
  wind_speed: number;
  wind_gust: number;
  wind_dir: number;
  barometer: number;
  dew_point: number;
  humidity: number;
  rain_today: number;
  rain_rate: number;
  sunrise: string;
  sunset: string;
  moon_phase: string;
  moon_visible: number;
}
