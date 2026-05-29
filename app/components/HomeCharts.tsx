"use client";

import { useEffect, useState } from "react";
import {
  TemperatureChart,
  RainChart,
  BarometerChart,
  MonthlyRainChart,
} from "./WeatherCharts";
import WindRose from "./WindRose";

interface Reading {
  timestamp: string;
  outside_temp: number | null;
  dew_point: number | null;
  wind_chill: number | null;
  heat_index: number | null;
  wind_speed: number | null;
  wind_gust: number | null;
  wind_dir: number | null;
  barometer: number | null;
  rain: number | null;
  rain_rate: number | null;
  humidity: number | null;
}

export default function HomeCharts({
  monthlyRain,
}: {
  monthlyRain?: { month: string; total_rain: number }[];
}) {
  const [readings, setReadings] = useState<Reading[]>([]);

  useEffect(() => {
    fetch("/api/readings?range=day")
      .then((r) => r.json())
      .then(setReadings)
      .catch(() => {});
  }, []);

  if (readings.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 h-[300px] animate-pulse"
          >
            <div className="h-4 bg-slate-700 rounded w-1/3 mb-4" />
            <div className="h-full bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <TemperatureChart data={readings} />
      <WindRose data={readings} />
      <RainChart data={readings} />
      <BarometerChart data={readings} />
      {monthlyRain && monthlyRain.length > 0 && (
        <MonthlyRainChart data={monthlyRain} />
      )}
    </div>
  );
}
