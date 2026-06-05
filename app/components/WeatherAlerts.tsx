"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "./LocaleProvider";

interface Alert {
  type: "warning" | "danger";
  key: string;
  message_en: string;
  message_it: string;
}

/** Send a browser notification via the service worker. */
function sendBrowserNotification(alert: Alert, locale: string) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    return;

  navigator.serviceWorker?.ready.then((reg) => {
    reg.active?.postMessage({
      type: "WEATHER_ALERT",
      title: alert.type === "danger" ? "⚠️ Weather Alert" : "⚡ Weather Notice",
      body: locale === "it" ? alert.message_it : alert.message_en,
      tag: `weather-alert-${alert.key}`,
    });
  });
}

export default function WeatherAlerts() {
  const { locale } = useLocale();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const notifiedKeys = useRef(new Set<string>());

  // Track notification permission
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  }, []);

  // Send browser notifications for NEW alerts
  useEffect(() => {
    for (const alert of alerts) {
      if (!notifiedKeys.current.has(alert.key)) {
        notifiedKeys.current.add(alert.key);
        sendBrowserNotification(alert, locale);
      }
    }
    // Clear notified keys for alerts that are no longer active
    const currentKeys = new Set(alerts.map((a) => a.key));
    for (const key of notifiedKeys.current) {
      if (!currentKeys.has(key)) notifiedKeys.current.delete(key);
    }
  }, [alerts, locale]);

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

  // Show notification opt-in if not yet granted and there are alerts
  const showNotifPrompt = notifPermission === "default" && alerts.length > 0;

  if (visible.length === 0 && !showNotifPrompt) return null;

  return (
    <div className="space-y-2">
      {showNotifPrompt && (
        <div className="rounded-lg px-4 py-3 flex items-center gap-3 text-sm font-medium border bg-sky-900/50 border-sky-700 text-sky-200">
          <span className="text-lg">🔔</span>
          <span className="flex-1">
            {locale === "it"
              ? "Attiva le notifiche per ricevere avvisi meteo importanti"
              : "Enable notifications to receive weather alerts"}
          </span>
          <button
            onClick={requestPermission}
            className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
          >
            {locale === "it" ? "Attiva" : "Enable"}
          </button>
        </div>
      )}
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
