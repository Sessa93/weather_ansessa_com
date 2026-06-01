import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const { rows } = await pool.query(
    `SELECT id, name, latitude, longitude, elevation_m FROM stations ORDER BY name ASC`,
  );
  return NextResponse.json(rows);
}
