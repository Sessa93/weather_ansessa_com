import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Check once whether station_id column exists (migration may not have run yet)
let _hasStationId: boolean | null = null;
async function hasStationId(): Promise<boolean> {
  if (_hasStationId !== null) return _hasStationId;
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = 'weather_readings' AND column_name = 'station_id' LIMIT 1`,
  );
  _hasStationId = rows.length > 0;
  return _hasStationId;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get("range") ?? "day";
  const stationId = searchParams.get("station") ?? "jerago";
  const useStation = await hasStationId();

  let interval: string;
  let bucket: string | null = null;
  switch (range) {
    case "week":
      interval = "7 days";
      bucket = "30 minutes";
      break;
    case "month":
      interval = "30 days";
      bucket = "1 hour";
      break;
    case "year":
      interval = "365 days";
      bucket = "1 day";
      break;
    default:
      interval = "1 day";
      break;
  }

  if (bucket) {
    const truncUnit =
      bucket === "1 day" ? "day" : bucket === "1 hour" ? "hour" : null;

    const bucketExpr = truncUnit
      ? `date_trunc('${truncUnit}', timestamp)`
      : `date_trunc('hour', timestamp) +
          (EXTRACT(EPOCH FROM timestamp - date_trunc('hour', timestamp))::int
           / EXTRACT(EPOCH FROM $2::interval)::int)
          * $2::interval`;

    const stationFilter = useStation
      ? `AND station_id = $${truncUnit ? "2" : "3"}`
      : "";

    const params = truncUnit
      ? useStation
        ? [interval, stationId]
        : [interval]
      : useStation
        ? [interval, bucket, stationId]
        : [interval, bucket];

    const { rows } = await pool.query(
      `SELECT
        ${bucketExpr} AS timestamp,
        ROUND(AVG(outside_temp)::numeric, 1)::float AS outside_temp,
        ROUND(AVG(dew_point)::numeric, 1)::float AS dew_point,
        ROUND(MIN(wind_chill)::numeric, 1)::float AS wind_chill,
        ROUND(MAX(heat_index)::numeric, 1)::float AS heat_index,
        ROUND(AVG(wind_speed)::numeric, 1)::float AS wind_speed,
        ROUND(MAX(wind_gust)::numeric, 1)::float AS wind_gust,
        ROUND(AVG(wind_dir)::numeric, 0)::float AS wind_dir,
        ROUND(AVG(barometer)::numeric, 1)::float AS barometer,
        ROUND(SUM(rain)::numeric, 2)::float AS rain,
        ROUND(MAX(rain_rate)::numeric, 2)::float AS rain_rate,
        ROUND(AVG(humidity)::numeric, 1)::float AS humidity
      FROM weather_readings
      WHERE timestamp >= NOW() - $1::interval
        ${stationFilter}
      GROUP BY 1
      ORDER BY 1 ASC`,
      params,
    );
    return NextResponse.json(rows);
  }

  // Day range: return all rows for today (since midnight)
  const stationFilter = useStation ? "AND station_id = $1" : "";
  const params = useStation ? [stationId] : [];

  const { rows } = await pool.query(
    `SELECT
      timestamp, outside_temp, dew_point, wind_chill, heat_index,
      wind_speed, wind_gust, wind_dir, barometer, rain, rain_rate, humidity
    FROM weather_readings
    WHERE timestamp::date = CURRENT_DATE
      ${stationFilter}
    ORDER BY timestamp ASC`,
    params,
  );

  return NextResponse.json(rows);
}
