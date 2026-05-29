"use client";

import { useEffect, useState } from "react";
import type { DailyForecast } from "@/lib/forecast";
import { getWeatherCondition } from "@/lib/forecast";
import WeatherIcon from "./WeatherIcon";

export default function Forecast() {
  const [data, setData] = useState<DailyForecast[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchForecast() {
      try {
        const res = await fetch("/api/forecast");
        if (!res.ok) throw new Error("Failed to fetch forecast");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError("Forecast unavailable");
      }
    }
    fetchForecast();
  }, []);

  if (error) return null; // Don't show anything if forecast fails
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
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
          <path d="M5 22h14" /><path d="M5 2h14" /><path d="M12 2v20" /><path d="m2 12 5 5 5-5 5 5 5-5" />
        </svg>
        7-Day Forecast
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
        {displayData.map((day) => {
          const date = new Date(day.date);
          const isToday = new Date().toDateString() === date.toDateString();
          const dayName = isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" });
          
          return (
            <div key={day.date} className="bg-slate-700/50 rounded-xl p-3 flex flex-col items-center text-center border border-slate-600/50 hover:bg-slate-700 transition-colors">
              <span className="text-sm font-medium text-slate-400 mb-2">{dayName}</span>
              <WeatherIcon code={day.weatherCode} className="w-10 h-10 mb-2" />
              <div className="text-sm text-slate-300 mb-1">{getWeatherCondition(day.weatherCode).split(",")[0]}</div>
              <div className="mt-auto flex gap-2 font-medium">
                <span className="text-red-400">{Math.round(day.maxTemp)}°</span>
                <span className="text-blue-400">{Math.round(day.minTemp)}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
