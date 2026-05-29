import { fetchForecast } from "@/lib/forecast";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  console.log("[api/forecast] Received request");
  try {
    const forecast = await fetchForecast();
    console.log(`[api/forecast] Success: ${forecast.length} days returned`);
    return NextResponse.json(forecast);
  } catch (err) {
    console.error("[api/forecast] Error fetching forecast:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch forecast" },
      { status: 500 }
    );
  }
}
