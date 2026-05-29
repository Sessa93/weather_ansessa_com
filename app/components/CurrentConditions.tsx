"use client";

import { useEffect, useState, useCallback } from "react";
import type { CurrentConditions } from "@/lib/types";
import WeatherIcon from "./WeatherIcon";

function windDirection(deg: number | null | undefined): string {
  if (deg === null || deg === undefined) return "";
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

export default function CurrentConditionsPanel() {
  const [data, setData] = useState<CurrentConditions | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fmt = (val: number | null | undefined, decimals: number) => {
    if (val === null || val === undefined) return "n/a";
    return val.toFixed(decimals);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/current");
      if (!res.ok) throw new Error("Failed to fetch");
      setData(await res.json());
      setError(null);
    } catch {
      setError("Unable to connect to weather station");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (error) {
    return (
      <div className="bg-red-900/40 border border-red-800 rounded-lg p-6 text-center text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-800 rounded-lg shadow p-6 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="h-16 bg-slate-700 rounded w-1/4 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-slate-700 rounded" />
          <div className="h-20 bg-slate-700 rounded" />
          <div className="h-20 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  const timestamp = new Date(data.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700">
      {/* Status bar */}
      <div className="bg-slate-950 text-slate-300 px-4 py-2 text-sm flex items-center gap-2 border-b border-slate-700">
        <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Connected to weather station live. Data received {timestamp}
      </div>

      {/* Main current conditions */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Weather Icon */}
          <div className="bg-slate-700/30 p-4 rounded-full border border-slate-600">
            <WeatherIcon condition={data.condition} className="w-16 h-16" />
          </div>

          {/* Big temperature */}
          <div className="flex items-center gap-4">
            <div className="text-6xl font-light text-slate-100">
              {fmt(data.temp, 1)}
              <span className="text-3xl text-slate-400">°C</span>
            </div>
          </div>

          {/* Condition + feels like */}
          <div>
            <div className="text-xl font-medium text-slate-200">
              {data.condition}
            </div>
            <div className="text-sm text-slate-400">
              Feels like: {fmt(data.feels_like, 1)} °C
            </div>
          </div>

          {/* High / Low */}
          <div className="ml-auto flex gap-4">
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">
                High
              </div>
              <div className="text-lg font-medium text-red-400">
                {fmt(data.high, 1)} °C
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">
                Low
              </div>
              <div className="text-lg font-medium text-blue-400">
                {fmt(data.low, 1)} °C
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <MetricCard
            label="Wind"
            value={`${fmt(data.wind_speed, 0)} km/h ${windDirection(data.wind_dir)}`}
            sub={`Gust: ${fmt(data.wind_gust, 0)} km/h`}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></svg>}
          />
          <MetricCard
            label="Barometer"
            value={`${fmt(data.barometer, 1)} mbar`}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 7v5l3 3" /></svg>}
          />
          <MetricCard
            label="Dew Point"
            value={`${fmt(data.dew_point, 1)} °C`}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /></svg>}
          />
          <MetricCard 
            label="Humidity" 
            value={`${fmt(data.humidity, 0)}%`} 
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /></svg>}
          />
          <MetricCard
            label="Rain Today"
            value={`${fmt(data.rain_today, 1)} mm`}
            sub={`Rate: ${fmt(data.rain_rate, 1)} mm/hr`}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M16 14v6" /><path d="M8 14v6" /><path d="M12 16v6" /></svg>}
          />
          <MetricCard 
            label="Sunrise" 
            value={data.sunrise} 
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8" /><path d="m4.93 10.93 1.41-1.41" /><path d="M2 18h2" /><path d="M20 18h2" /><path d="m19.07 10.93-1.41-1.41" /><path d="M22 22H2" /><path d="m8 22 4-4 4 4" /></svg>}
          />
          <MetricCard 
            label="Sunset" 
            value={data.sunset} 
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10V2" /><path d="m4.93 10.93 1.41-1.41" /><path d="M2 18h2" /><path d="M20 18h2" /><path d="m19.07 10.93-1.41-1.41" /><path d="M22 22H2" /><path d="m16 22-4-4-4 4" /></svg>}
          />
          <MetricCard
            label="Moon"
            value={data.moon_phase}
            sub={`${data.moon_visible}% visible`}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>}
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-3 flex items-start gap-3">
      {icon && <div className="mt-1 text-slate-400">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-400 uppercase font-semibold mb-1">
          {label}
        </div>
        <div className="text-base font-medium text-slate-100 truncate">
          {value}
        </div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
