import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const { rows } = await pool.query(
    `SELECT timestamp, barometer
     FROM weather_readings
     WHERE timestamp >= NOW() - INTERVAL '3 hours'
       AND barometer IS NOT NULL
     ORDER BY timestamp ASC`,
  );

  return NextResponse.json(rows);
}
