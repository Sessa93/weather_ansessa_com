-- Weather readings table (realtime + historical)
CREATE TABLE IF NOT EXISTS weather_readings (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outside_temp REAL,
  feels_like REAL,
  dew_point REAL,
  humidity REAL,
  wind_speed REAL,
  wind_gust REAL,
  wind_dir REAL,
  barometer REAL,
  rain REAL,
  rain_rate REAL,
  wind_chill REAL,
  heat_index REAL,
  UNIQUE (timestamp)
);

CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON weather_readings (timestamp DESC);

-- Daily summary / records
CREATE TABLE IF NOT EXISTS daily_records (
  date DATE PRIMARY KEY,
  high_temp REAL,
  low_temp REAL,
  avg_wind REAL,
  high_wind REAL,
  total_rain REAL,
  high_rain_rate REAL
);

-- All-time records
CREATE TABLE IF NOT EXISTS all_time_records (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  value REAL,
  unit TEXT,
  recorded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alltime_category ON all_time_records (category);
