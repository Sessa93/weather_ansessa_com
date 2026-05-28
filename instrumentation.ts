/**
 * Next.js instrumentation hook – runs once when the server starts.
 * Starts a background interval that fetches station data and stores it in PostgreSQL.
 *
 * Configure the interval via INGEST_INTERVAL_MS env var (default: 600000 = 10 minutes).
 */
export async function onRequestError() {
  // required export – no-op
}

export async function register() {
  // Only run on the server (Node.js runtime), not during build or on the edge
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const intervalMs = parseInt(process.env.INGEST_INTERVAL_MS ?? "600000", 10);

    // Dynamic import so this code is never bundled for the client
    const { ingestReading } = await import("./lib/ingest");

    async function tick() {
      try {
        const result = await ingestReading();
        console.log(
          `[ingest] Stored reading at ${result.timestamp.toISOString()}`,
        );
      } catch (err) {
        console.error(
          "[ingest] Failed:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Fetch immediately on startup, then repeat on interval
    tick();
    setInterval(tick, intervalMs);

    console.log(
      `[ingest] Background worker started – polling every ${intervalMs / 1000}s`,
    );
  }
}
