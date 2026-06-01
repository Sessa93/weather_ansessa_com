import { NextResponse } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  isLocale,
} from "@/lib/i18n";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    locale?: string;
  } | null;
  const locale = body?.locale;

  if (!isLocale(locale)) {
    return NextResponse.json(
      {
        error: `Locale must be one of: ${SUPPORTED_LOCALES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    locale: locale ?? DEFAULT_LOCALE,
  });
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
