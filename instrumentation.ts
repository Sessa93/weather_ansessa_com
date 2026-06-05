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

    let consecutiveFailures = 0;
    const MAX_BACKOFF_MULTIPLIER = 6; // caps at 6× the base interval (60 min at default)

    async function tick() {
      try {
        const result = await ingestReading();
        consecutiveFailures = 0;
        console.log(
          `[ingest] Stored reading at ${result.timestamp.toISOString()}`,
        );
      } catch (err) {
        consecutiveFailures++;
        const suppressLog = consecutiveFailures > 3 && consecutiveFailures % 6 !== 0;
        if (!suppressLog) {
          console.error(
            "[ingest] Failed:",
            err instanceof Error ? err.message : err,
            consecutiveFailures > 1 ? `(${consecutiveFailures} consecutive failures)` : "",
          );
        }
      }
      // Schedule next tick with exponential backoff on failures
      const backoff = Math.min(consecutiveFailures, MAX_BACKOFF_MULTIPLIER);
      const nextMs = intervalMs * (1 + backoff);
      setTimeout(tick, nextMs);
    }

    // Fetch immediately on startup, then self-scheduling via setTimeout
    tick();

    console.log(
      `[ingest] Background worker started – polling every ${intervalMs / 1000}s`,
    );
  }
}
