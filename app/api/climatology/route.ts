import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const [daily, yearsRes] = await Promise.all([
    pool.query(
      `SELECT
        timestamp::date AS date,
        ROUND(MIN(outside_temp)::numeric, 1)::float AS temp_min,
        ROUND(MAX(outside_temp)::numeric, 1)::float AS temp_max,
        ROUND(AVG(outside_temp)::numeric, 1)::float AS temp_avg
      FROM weather_readings
      WHERE EXTRACT(YEAR FROM timestamp) = $1
        AND outside_temp IS NOT NULL
      GROUP BY 1
      ORDER BY 1`,
      [year],
    ),
    pool.query(
      `SELECT DISTINCT EXTRACT(YEAR FROM timestamp)::int AS year
      FROM weather_readings
      ORDER BY 1`,
    ),
  ]);

  return NextResponse.json({
    year,
    data: daily.rows,
    years: yearsRes.rows.map((r: { year: number }) => r.year),
  });
}
