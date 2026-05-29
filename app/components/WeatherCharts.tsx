"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
} from "recharts";
import { format } from "date-fns";

import type { ReactNode } from "react";

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

function formatTime(label: ReactNode) {
  return format(new Date(String(label)), "HH:mm");
}

function formatDate(label: ReactNode) {
  return format(new Date(String(label)), "dd MMM HH:mm");
}

export function TemperatureChart({
  data,
  long,
}: {
  data: Reading[];
  long?: boolean;
}) {
  const fmt = long ? formatDate : formatTime;
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Temperature</h3>
      <ResponsiveContainer width="100%" className="flex-1" minHeight={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={fmt}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            interval="preserveStartEnd"
            stroke="#475569"
          />
          <YAxis
            unit="°C"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            stroke="#475569"
          />
          <Tooltip
            labelFormatter={fmt}
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 8,
              color: "#e2e8f0",
            }}
          />
          <Legend
            iconSize={10}
            wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
          />
          <Line
            type="monotone"
            dataKey="outside_temp"
            name="Temperature"
            stroke="#ef4444"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="dew_point"
            name="Dew Point"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={1.5}
          />
          <Line
            type="monotone"
            dataKey="wind_chill"
            name="Wind Chill"
            stroke="#8b5cf6"
            dot={false}
            strokeWidth={1}
            strokeDasharray="4 2"
          />
          <Line
            type="monotone"
            dataKey="heat_index"
            name="Heat Index"
            stroke="#f97316"
            dot={false}
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WindChart({ data, long }: { data: Reading[]; long?: boolean }) {
  const fmt = long ? formatDate : formatTime;
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Wind Speed</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={fmt}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            interval="preserveStartEnd"
            stroke="#475569"
          />
          <YAxis
            unit=" km/h"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            stroke="#475569"
          />
          <Tooltip
            labelFormatter={fmt}
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 8,
              color: "#e2e8f0",
            }}
          />
          <Legend
            iconSize={10}
            wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
          />
          <Area
            type="monotone"
            dataKey="wind_gust"
            name="Gust"
            stroke="#f59e0b"
            fill="#78350f"
            fillOpacity={0.4}
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="wind_speed"
            name="Wind Speed"
            stroke="#10b981"
            fill="#064e3b"
            fillOpacity={0.4}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RainChart({ data, long }: { data: Reading[]; long?: boolean }) {
  const fmt = long ? formatDate : formatTime;
  // Compute cumulative rain
  let cumulative = 0;
  const rainData = data.map((d) => {
    cumulative += Number(d.rain) || 0;
    return { ...d, rain_total: +cumulative.toFixed(1) };
  });

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Rain</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={rainData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={fmt}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            interval="preserveStartEnd"
            stroke="#475569"
          />
          <YAxis
            yAxisId="left"
            unit=" mm/hr"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            stroke="#475569"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            unit=" mm"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            stroke="#475569"
          />
          <Tooltip
            labelFormatter={fmt}
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 8,
              color: "#e2e8f0",
            }}
          />
          <Legend
            iconSize={10}
            wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
          />
          <Bar
            yAxisId="left"
            dataKey="rain_rate"
            name="Rain Rate"
            fill="#60a5fa"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="rain_total"
            name="Total"
            stroke="#1d4ed8"
            dot={false}
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarometerChart({
  data,
  long,
}: {
  data: Reading[];
  long?: boolean;
}) {
  const fmt = long ? formatDate : formatTime;
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Barometer</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={fmt}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            interval="preserveStartEnd"
            stroke="#475569"
          />
          <YAxis
            unit=" mbar"
            domain={["dataMin - 2", "dataMax + 2"]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            stroke="#475569"
          />
          <Tooltip
            labelFormatter={fmt}
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 8,
              color: "#e2e8f0",
            }}
          />
          <Area
            type="monotone"
            dataKey="barometer"
            name="Barometer"
            stroke="#818cf8"
            fill="#312e81"
            fillOpacity={0.4}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyRainChart({
  data,
}: {
  data: { month: string; total_rain: number }[];
}) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.month), "MMM"),
    total_rain: +(d.total_rain ?? 0),
  }));

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">
        Rain Totals By Month
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            stroke="#475569"
          />
          <YAxis
            unit=" mm"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            stroke="#475569"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 8,
              color: "#e2e8f0",
            }}
          />
          <Bar
            dataKey="total_rain"
            name="Rain (mm)"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
