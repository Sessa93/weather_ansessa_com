import { NextResponse } from "next/server";

export async function POST() {
  const url = process.env.STATION_URL;
  if (!url) {
    return NextResponse.json({ error: "STATION_URL not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${url}/v1/real_time?duration=300`, {
      signal: AbortSignal.timeout(5000),
    });
    const body = await res.json();
    console.log("[start-live] WLL broadcast started:", JSON.stringify(body));
    return NextResponse.json(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[start-live] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
