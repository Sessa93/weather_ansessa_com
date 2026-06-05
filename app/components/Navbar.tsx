"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "./LocaleProvider";
import { SUPPORTED_LOCALES } from "@/lib/i18n";

export default function Navbar() {
  const pathname = usePathname();
  const { locale, messages, setLocale, isPending } = useLocale();
  const links = [
    { href: "/", label: messages.nav.home },
    { href: "/graphs", label: messages.nav.graphs },
    { href: "/records", label: messages.nav.records },
    { href: "/reports", label: messages.nav.reports },
    { href: "/about", label: messages.nav.about },
  ];

  return (
    <nav className="bg-slate-950 text-slate-200 shadow-lg border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 min-h-14 py-2">
          <Link
            href="/"
            className="text-lg font-bold tracking-wide text-sky-400"
          >
            {messages.nav.stationName}
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-sky-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div
              className="flex items-center rounded-lg border border-slate-700 bg-slate-900/70 p-1"
              aria-label={messages.nav.language}
            >
              {SUPPORTED_LOCALES.map((supportedLocale) => (
                <button
                  key={supportedLocale}
                  type="button"
                  onClick={() => setLocale(supportedLocale)}
                  disabled={isPending}
                  className={`rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    locale === supportedLocale
                      ? "bg-sky-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  } ${isPending ? "cursor-wait" : ""}`}
                >
                  {supportedLocale}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
