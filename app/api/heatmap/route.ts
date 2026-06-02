import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const metric = searchParams.get("metric") ?? "avg_temp";

  let valueExpr: string;
  switch (metric) {
    case "high_temp":
      valueExpr = "MAX(outside_temp)";
      break;
    case "low_temp":
      valueExpr = "MIN(outside_temp)";
      break;
    case "total_rain":
      valueExpr = "SUM(rain)";
      break;
    case "avg_humidity":
      valueExpr = "AVG(humidity)";
      break;
    default:
      valueExpr = "AVG(outside_temp)";
      break;
  }

  const { rows } = await pool.query(
    `SELECT
      to_char(timestamp::date, 'YYYY-MM-DD') AS date,
      ROUND(${valueExpr}::numeric, 1)::float AS value
    FROM weather_readings
    WHERE timestamp >= NOW() - INTERVAL '365 days'
    GROUP BY timestamp::date
    ORDER BY timestamp::date ASC`,
  );

  return NextResponse.json(rows);
}
