"use client";

import { useEffect, useState } from "react";
import type { DailyForecast } from "@/lib/forecast";
import { getLocalizedWeatherCondition } from "@/lib/i18n";
import WeatherIcon from "./WeatherIcon";
import { useLocale } from "./LocaleProvider";

export default function Forecast() {
  const { locale, intlLocale, messages } = useLocale();
  const [data, setData] = useState<DailyForecast[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchForecast() {
      console.log("[Forecast] Fetching forecast data...");
      try {
        const res = await fetch("/api/forecast");
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to fetch forecast: ${res.status}`,
          );
        }
        const json = await res.json();
        console.log("[Forecast] Data received:", json);
        setData(json);
      } catch (err) {
        console.error("[Forecast] Error:", err);
        setError(messages.forecast.unavailable);
      }
    }
    fetchForecast();
  }, [messages.forecast.unavailable]);

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-lg border border-red-900/50 p-6 flex flex-col items-center justify-center text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-500 mb-2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3 className="text-slate-200 font-medium">{error}</h3>
        <p className="text-slate-400 text-sm mt-1">{messages.forecast.help}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/4 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Show only 7 days
  const displayData = data.slice(0, 7);

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
      <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-400"
        >
          <path d="M5 22h14" />
          <path d="M5 2h14" />
          <path d="M12 2v20" />
          <path d="m2 12 5 5 5-5 5 5 5-5" />
        </svg>
        {messages.forecast.title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
        {displayData.map((day) => {
          const date = new Date(day.date);
          const isToday = new Date().toDateString() === date.toDateString();
          const dayName = isToday
            ? messages.common.today
            : date.toLocaleDateString(intlLocale, { weekday: "short" });

          return (
            <div
              key={day.date}
              className="bg-slate-700/50 rounded-xl p-3 flex flex-col items-center text-center border border-slate-600/50 hover:bg-slate-700 transition-colors"
            >
              <span className="text-sm font-medium text-slate-400 mb-2">
                {dayName}
              </span>
              <WeatherIcon code={day.weatherCode} className="w-10 h-10 mb-2" />
              <div className="text-sm text-slate-300 mb-1">
                {
                  getLocalizedWeatherCondition(day.weatherCode, locale).split(
                    ",",
                  )[0]
                }
              </div>
              <div className="mt-auto flex gap-2 font-medium">
                <span className="text-red-400">{Math.round(day.maxTemp)}°</span>
                <span className="text-blue-400">
                  {Math.round(day.minTemp)}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
