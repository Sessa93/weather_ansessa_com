import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();
  const duration = Date.now() - start;

  const method = request.method;
  const url = request.nextUrl.pathname + (request.nextUrl.search || "");
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "-";
  const ua = request.headers.get("user-agent") ?? "-";

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  process.stdout.write(
    `[access] ${now} ${method} ${url} ${duration}ms - ${ip} - ${ua}\n`,
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icons/, sw.js, manifest.json (public assets)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icons/|sw\\.js|manifest\\.json).*)",
  ],
};
