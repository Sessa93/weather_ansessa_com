import { fetchForecast } from "@/lib/forecast";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const forecast = await fetchForecast();
    return NextResponse.json(forecast);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch forecast" },
      { status: 500 }
    );
  }
}
