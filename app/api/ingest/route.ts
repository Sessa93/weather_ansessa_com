import { ingestReading } from "@/lib/ingest";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ingest
 *
 * Fetches current conditions from the station and stores in PostgreSQL.
 * The background worker in instrumentation.ts handles periodic ingestion
 * automatically. This endpoint is kept for manual / on-demand use.
 *
 * Optionally accepts an `Authorization: Bearer <token>` header that must
 * match the INGEST_SECRET env var (if set) to prevent unauthorized calls.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await ingestReading();
    return NextResponse.json({ ok: true, timestamp: result.timestamp });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
