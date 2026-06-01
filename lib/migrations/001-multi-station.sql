-- Migration: Add multi-station support
-- Run this on existing databases to add station_id columns

-- 1. Create stations table
CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  elevation_m REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Insert default station
INSERT INTO stations (id, name, latitude, longitude, elevation_m)
VALUES ('jerago', 'Jerago con Orago', 45.71, 8.79, 290)
ON CONFLICT (id) DO NOTHING;

-- 3. Add station_id to weather_readings (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weather_readings' AND column_name = 'station_id'
  ) THEN
    ALTER TABLE weather_readings ADD COLUMN station_id TEXT NOT NULL DEFAULT 'jerago' REFERENCES stations(id);
    DROP INDEX IF EXISTS idx_readings_timestamp;
    CREATE INDEX idx_readings_station_timestamp ON weather_readings (station_id, timestamp DESC);
    CREATE INDEX idx_readings_timestamp ON weather_readings (timestamp DESC);

    -- Replace unique constraint
    ALTER TABLE weather_readings DROP CONSTRAINT IF EXISTS weather_readings_timestamp_key;
    ALTER TABLE weather_readings ADD CONSTRAINT weather_readings_station_timestamp_key UNIQUE (station_id, timestamp);
  END IF;
END $$;

-- 4. Add station_id to daily_records (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_records' AND column_name = 'station_id'
  ) THEN
    ALTER TABLE daily_records ADD COLUMN station_id TEXT NOT NULL DEFAULT 'jerago' REFERENCES stations(id);
    ALTER TABLE daily_records DROP CONSTRAINT IF EXISTS daily_records_pkey;
    ALTER TABLE daily_records ADD PRIMARY KEY (station_id, date);
  END IF;
END $$;

-- 5. Add station_id to all_time_records (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'all_time_records' AND column_name = 'station_id'
  ) THEN
    ALTER TABLE all_time_records ADD COLUMN station_id TEXT NOT NULL DEFAULT 'jerago' REFERENCES stations(id);
    CREATE INDEX IF NOT EXISTS idx_alltime_station ON all_time_records (station_id);
  END IF;
END $$;
