import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get("range") ?? "day";
  const currentYear = new Date().getFullYear();
  const compareYear = parseInt(
    searchParams.get("year") ?? String(currentYear - 1),
  );
  const offsetYears = currentYear - compareYear;

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

    const shiftedTs = `timestamp + make_interval(years => $3::int)`;

    const bucketExpr = truncUnit
      ? `date_trunc('${truncUnit}', ${shiftedTs})`
      : `date_trunc('hour', ${shiftedTs}) +
          (EXTRACT(EPOCH FROM ${shiftedTs} - date_trunc('hour', ${shiftedTs}))::int
           / EXTRACT(EPOCH FROM $2::interval)::int)
          * $2::interval`;

    const params = truncUnit
      ? [interval, null, offsetYears]
      : [interval, bucket, offsetYears];

    const { rows } = await pool.query(
      `SELECT
        ${bucketExpr} AS timestamp,
        ROUND(AVG(outside_temp)::numeric, 1)::float  AS outside_temp,
        ROUND(AVG(dew_point)::numeric, 1)::float     AS dew_point,
        ROUND(MIN(wind_chill)::numeric, 1)::float    AS wind_chill,
        ROUND(MAX(heat_index)::numeric, 1)::float    AS heat_index,
        ROUND(AVG(wind_speed)::numeric, 1)::float    AS wind_speed,
        ROUND(MAX(wind_gust)::numeric, 1)::float     AS wind_gust,
        ROUND(AVG(barometer)::numeric, 1)::float     AS barometer,
        ROUND(SUM(rain)::numeric, 2)::float          AS rain,
        ROUND(MAX(rain_rate)::numeric, 2)::float     AS rain_rate,
        ROUND(AVG(humidity)::numeric, 1)::float      AS humidity
      FROM weather_readings
      WHERE timestamp >= NOW() - make_interval(years => $3::int) - $1::interval
        AND timestamp <  NOW() - make_interval(years => $3::int)
      GROUP BY 1
      ORDER BY 1 ASC`,
      params,
    );
    return NextResponse.json(rows);
  }

  // Day range: same day in compareYear, timestamps shifted to today
  const { rows } = await pool.query(
    `SELECT
      timestamp + make_interval(years => $1::int) AS timestamp,
      outside_temp, dew_point, wind_chill, heat_index,
      wind_speed, wind_gust, barometer, rain, rain_rate, humidity
    FROM weather_readings
    WHERE timestamp::date = (CURRENT_DATE - make_interval(years => $1::int))::date
    ORDER BY timestamp ASC`,
    [offsetYears],
  );
  return NextResponse.json(rows);
}
