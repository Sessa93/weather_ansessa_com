import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  // Monthly totals + list of available years
  const [monthly, years] = await Promise.all([
    pool.query(
      `SELECT
        EXTRACT(MONTH FROM timestamp)::int AS month,
        ROUND(SUM(rain)::numeric, 1)::float AS total
      FROM weather_readings
      WHERE EXTRACT(YEAR FROM timestamp) = $1
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
    months: monthly.rows,
    years: years.rows.map((r: { year: number }) => r.year),
  });
}
