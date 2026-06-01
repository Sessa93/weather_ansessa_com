import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get("range") ?? "day";

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

  // Return data from exactly 1 year ago for the same range window
  // Shift timestamps forward by 1 year so they overlay on current data
  if (bucket) {
    const truncUnit =
      bucket === "1 day" ? "day" : bucket === "1 hour" ? "hour" : null;

    const bucketExpr = truncUnit
      ? `date_trunc('${truncUnit}', timestamp + INTERVAL '1 year')`
      : `date_trunc('hour', timestamp + INTERVAL '1 year') +
          (EXTRACT(EPOCH FROM (timestamp + INTERVAL '1 year') - date_trunc('hour', timestamp + INTERVAL '1 year'))::int
           / EXTRACT(EPOCH FROM $2::interval)::int)
          * $2::interval`;

    const { rows } = await pool.query(
      `SELECT
        ${bucketExpr} AS timestamp,
        ROUND(AVG(outside_temp)::numeric, 1)::float AS outside_temp,
        ROUND(AVG(humidity)::numeric, 1)::float AS humidity,
        ROUND(AVG(barometer)::numeric, 1)::float AS barometer
      FROM weather_readings
      WHERE timestamp >= NOW() - INTERVAL '1 year' - $1::interval
        AND timestamp < NOW() - INTERVAL '1 year'
      GROUP BY 1
      ORDER BY 1 ASC`,
      truncUnit ? [interval] : [interval, bucket],
    );
    return NextResponse.json(rows);
  }

  // Day range: same day last year
  const { rows } = await pool.query(
    `SELECT
      timestamp + INTERVAL '1 year' AS timestamp,
      outside_temp, humidity, barometer
    FROM weather_readings
    WHERE timestamp::date = (CURRENT_DATE - INTERVAL '1 year')::date
    ORDER BY timestamp ASC`,
  );

  return NextResponse.json(rows);
}
