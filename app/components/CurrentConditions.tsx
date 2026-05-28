"use client";

import { useEffect, useState, useCallback } from "react";
import type { CurrentConditions } from "@/lib/types";

function windDirection(deg: number): string {
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
          {/* Big temperature */}
          <div className="flex items-center gap-4">
            <div className="text-6xl font-light text-slate-100">
              {data.temp.toFixed(1)}
              <span className="text-3xl">°C</span>
            </div>
          </div>

          {/* Condition + feels like */}
          <div>
            <div className="text-xl font-medium text-slate-200">
              {data.condition}
            </div>
            <div className="text-sm text-slate-400">
              Feels like: {data.feels_like.toFixed(1)} °C
            </div>
          </div>

          {/* High / Low */}
          <div className="ml-auto flex gap-4">
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">
                High
              </div>
              <div className="text-lg font-medium text-red-400">
                {data.high.toFixed(1)} °C
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">
                Low
              </div>
              <div className="text-lg font-medium text-blue-400">
                {data.low.toFixed(1)} °C
              </div>
            </div>
          </div>
        </div>

        {/* Grid of metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <MetricCard
            label="Wind"
            value={`${data.wind_speed.toFixed(0)} km/h ${windDirection(data.wind_dir)}`}
            sub={`Gust: ${data.wind_gust.toFixed(0)} km/h`}
          />
          <MetricCard
            label="Barometer"
            value={`${data.barometer.toFixed(1)} mbar`}
          />
          <MetricCard
            label="Dew Point"
            value={`${data.dew_point.toFixed(1)} °C`}
          />
          <MetricCard label="Humidity" value={`${data.humidity.toFixed(0)}%`} />
          <MetricCard
            label="Rain Today"
            value={`${(+data.rain_today).toFixed(1)} mm`}
            sub={`Rate: ${data.rain_rate.toFixed(1)} mm/hr`}
          />
          <MetricCard label="Sunrise" value={data.sunrise} />
          <MetricCard label="Sunset" value={data.sunset} />
          <MetricCard
            label="Moon"
            value={data.moon_phase}
            sub={`${data.moon_visible}% visible`}
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
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-3">
      <div className="text-xs text-slate-400 uppercase font-semibold mb-1">
        {label}
      </div>
      <div className="text-base font-medium text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
