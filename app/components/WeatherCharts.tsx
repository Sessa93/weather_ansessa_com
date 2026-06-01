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

import type { ReactNode } from "react";
import { useLocale } from "./LocaleProvider";

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

function formatTime(label: ReactNode, intlLocale: string) {
  const value = new Date(String(label));
  if (Number.isNaN(value.getTime())) return String(label);
  return value.toLocaleTimeString(intlLocale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(label: ReactNode, intlLocale: string) {
  const value = new Date(String(label));
  if (Number.isNaN(value.getTime())) return String(label);
  return value.toLocaleString(intlLocale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function TemperatureChart({
  data,
  long,
}: {
  data: Reading[];
  long?: boolean;
}) {
  const { intlLocale, messages } = useLocale();
  const fmt = (label: ReactNode) =>
    long ? formatDate(label, intlLocale) : formatTime(label, intlLocale);
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">
        {messages.charts.temperature}
      </h3>
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
            name={messages.charts.temperature}
            stroke="#ef4444"
            dot={false}
            strokeWidth={2}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="dew_point"
            name={messages.charts.dewPoint}
            stroke="#3b82f6"
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="wind_chill"
            name={messages.charts.windChill}
            stroke="#8b5cf6"
            dot={false}
            strokeWidth={1}
            strokeDasharray="4 2"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="heat_index"
            name={messages.charts.heatIndex}
            stroke="#f97316"
            dot={false}
            strokeWidth={1}
            strokeDasharray="4 2"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WindChart({ data, long }: { data: Reading[]; long?: boolean }) {
  const { intlLocale, messages } = useLocale();
  const fmt = (label: ReactNode) =>
    long ? formatDate(label, intlLocale) : formatTime(label, intlLocale);
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">
        {messages.charts.windSpeed}
      </h3>
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
            name={messages.charts.gust}
            stroke="#f59e0b"
            fill="#78350f"
            fillOpacity={0.4}
            strokeWidth={1.5}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="wind_speed"
            name={messages.charts.windSpeed}
            stroke="#10b981"
            fill="#064e3b"
            fillOpacity={0.4}
            strokeWidth={2}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RainChart({ data, long }: { data: Reading[]; long?: boolean }) {
  const { intlLocale, messages } = useLocale();
  const fmt = (label: ReactNode) =>
    long ? formatDate(label, intlLocale) : formatTime(label, intlLocale);
  const rainData = data.reduce<Array<Reading & { rain_total: number }>>(
    (acc, reading) => {
      const previousTotal = acc[acc.length - 1]?.rain_total ?? 0;
      const nextTotal = previousTotal + (Number(reading.rain) || 0);
      acc.push({ ...reading, rain_total: +nextTotal.toFixed(1) });
      return acc;
    },
    [],
  );

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">
        {messages.charts.rain}
      </h3>
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
            name={messages.charts.rainRate}
            fill="#60a5fa"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="rain_total"
            name={messages.charts.total}
            stroke="#1d4ed8"
            dot={false}
            strokeWidth={2}
            connectNulls
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
  const { intlLocale, messages } = useLocale();
  const fmt = (label: ReactNode) =>
    long ? formatDate(label, intlLocale) : formatTime(label, intlLocale);
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">
        {messages.charts.barometer}
      </h3>
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
            name={messages.charts.barometer}
            stroke="#818cf8"
            fill="#312e81"
            fillOpacity={0.4}
            strokeWidth={2}
            connectNulls
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
  const { intlLocale, messages } = useLocale();
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.month).toLocaleDateString(intlLocale, { month: "short" }),
    total_rain: +(d.total_rain ?? 0),
  }));

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">
        {messages.charts.monthlyRainfall}
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
            name={`${messages.charts.rainLabel} (mm)`}
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
