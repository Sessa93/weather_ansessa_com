-- Stations registry (multi-station support)
CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  elevation_m REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default station
INSERT INTO stations (id, name, latitude, longitude, elevation_m)
VALUES ('jerago', 'Jerago con Orago', 45.71, 8.79, 290)
ON CONFLICT (id) DO NOTHING;

-- Weather readings table (realtime + historical)
CREATE TABLE IF NOT EXISTS weather_readings (
  id SERIAL PRIMARY KEY,
  station_id TEXT NOT NULL DEFAULT 'jerago' REFERENCES stations(id),
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
  UNIQUE (station_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_readings_station_timestamp ON weather_readings (station_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON weather_readings (timestamp DESC);

-- Daily summary / records
CREATE TABLE IF NOT EXISTS daily_records (
  station_id TEXT NOT NULL DEFAULT 'jerago' REFERENCES stations(id),
  date DATE NOT NULL,
  high_temp REAL,
  low_temp REAL,
  avg_wind REAL,
  high_wind REAL,
  total_rain REAL,
  high_rain_rate REAL,
  PRIMARY KEY (station_id, date)
);

-- All-time records
CREATE TABLE IF NOT EXISTS all_time_records (
  id SERIAL PRIMARY KEY,
  station_id TEXT NOT NULL DEFAULT 'jerago' REFERENCES stations(id),
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  value REAL,
  unit TEXT,
  recorded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alltime_category ON all_time_records (category);
CREATE INDEX IF NOT EXISTS idx_alltime_station ON all_time_records (station_id);
