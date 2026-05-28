"use client";

import { useEffect, useState } from "react";
import {
  TemperatureChart,
  RainChart,
  BarometerChart,
} from "../components/WeatherCharts";
import WindRose from "../components/WindRose";

type Range = "day" | "week" | "month" | "year";

const ranges: { value: Range; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

interface Reading {
  timestamp: string;
  outside_temp: number;
  dew_point: number;
  wind_chill: number;
  heat_index: number;
  wind_speed: number;
  wind_gust: number;
  wind_dir: number;
  barometer: number;
  rain: number;
  rain_rate: number;
  humidity: number;
}

export default function GraphsPage() {
  const [range, setRange] = useState<Range>("day");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/readings?range=${range}`)
      .then((r) => r.json())
      .then((data) => {
        setReadings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [range]);

  const long = range !== "day";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">
        Weather Observation Graphs
      </h1>

      {/* Range selector */}
      <div className="flex gap-1">
        {ranges.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
              range === r.value
                ? "bg-sky-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow p-4 h-[300px] animate-pulse"
            >
              <div className="h-4 bg-zinc-200 rounded w-1/3 mb-4" />
              <div className="h-full bg-zinc-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TemperatureChart data={readings} long={long} />
          <WindRose data={readings} />
          <RainChart data={readings} long={long} />
          <BarometerChart data={readings} long={long} />
        </div>
      )}
    </div>
  );
}
