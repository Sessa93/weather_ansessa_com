"use client";

import { useEffect, useState } from "react";
import { useLocale } from "./LocaleProvider";

interface Alert {
  type: "warning" | "danger";
  key: string;
  message_en: string;
  message_it: string;
}

export default function WeatherAlerts() {
  const { locale } = useLocale();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAlerts = () => {
      fetch("/api/alerts")
        .then((r) => r.json())
        .then(setAlerts)
        .catch(() => {});
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(interval);
  }, []);

  const visible = alerts.filter((a) => !dismissed.has(a.key));
  if (visible.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 space-y-2">
      {visible.map((alert) => (
        <div
          key={alert.key}
          className={`rounded-lg px-4 py-3 flex items-center gap-3 text-sm font-medium border ${
            alert.type === "danger"
              ? "bg-red-900/50 border-red-700 text-red-200"
              : "bg-amber-900/50 border-amber-700 text-amber-200"
          }`}
        >
          <span className="text-lg">
            {alert.type === "danger" ? "⚠️" : "⚡"}
          </span>
          <span className="flex-1">
            {locale === "it" ? alert.message_it : alert.message_en}
          </span>
          <button
            onClick={() =>
              setDismissed((prev) => new Set([...prev, alert.key]))
            }
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
