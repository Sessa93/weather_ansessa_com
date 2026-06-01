"use client";

import { useEffect, useState } from "react";
import {
  TemperatureChart,
  RainChart,
  BarometerChart,
  HumidityChart,
} from "../components/WeatherCharts";
import WindRose from "../components/WindRose";
import { useLocale } from "../components/LocaleProvider";

type Range = "day" | "week" | "month" | "year";

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
  const { messages } = useLocale();
  const [range, setRange] = useState<Range>("day");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [compareData, setCompareData] = useState<Reading[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [loading, setLoading] = useState(true);

  const ranges: { value: Range; label: string }[] = [
    { value: "day", label: messages.common.today },
    { value: "week", label: messages.common.week },
    { value: "month", label: messages.common.month },
    { value: "year", label: messages.common.year },
  ];

  useEffect(() => {
    fetch(`/api/readings?range=${range}`)
      .then((r) => r.json())
      .then((data) => {
        setReadings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    if (!showCompare) {
      setCompareData([]);
      return;
    }
    fetch(`/api/readings-compare?range=${range}`)
      .then((r) => r.json())
      .then(setCompareData)
      .catch(() => setCompareData([]));
  }, [range, showCompare]);

  const long = range !== "day";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">
        {messages.graphs.title}
      </h1>

      {/* Range selector + export buttons */}
      <div className="flex gap-1 flex-wrap items-center">
        {ranges.map((r) => (
          <button
            key={r.value}
            onClick={() => {
              setLoading(true);
              setRange(r.value);
            }}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
              range === r.value
                ? "bg-sky-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700"
            }`}
          >
            {r.label}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setShowCompare(!showCompare)}
            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
              showCompare
                ? "bg-amber-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700"
            }`}
          >
            {messages.graphs.compareLastYear}
          </button>
          <a
            href={`/api/export?range=${range}&format=csv`}
            download
            className="px-3 py-2 text-sm font-medium rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700 transition-colors"
          >
            {messages.graphs.exportCSV}
          </a>
          <a
            href={`/api/export?range=${range}&format=json`}
            download
            className="px-3 py-2 text-sm font-medium rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700 transition-colors"
          >
            {messages.graphs.exportJSON}
          </a>
        </div>
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
          <TemperatureChart
            data={readings}
            long={long}
            compareData={showCompare ? compareData : undefined}
          />
          <WindRose data={readings} />
          <RainChart data={readings} long={long} />
          <BarometerChart data={readings} long={long} />
          <div className="md:col-span-2">
            <HumidityChart data={readings} long={long} />
          </div>
        </div>
      )}
    </div>
  );
}
