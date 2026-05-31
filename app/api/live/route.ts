import { getMqttClient } from "@/lib/mqtt";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  const client = getMqttClient();

  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (_: string, msg: Buffer) => {
        try {
          controller.enqueue(encoder.encode(`data: ${msg.toString()}\n\n`));
        } catch {
          cleanup();
        }
      };

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          cleanup();
        }
      }, 30_000);

      cleanup = () => {
        client.off("message", send);
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      };

      client.on("message", send);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
