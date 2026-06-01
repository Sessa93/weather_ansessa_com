"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useLocale } from "./LocaleProvider";

interface DayRow {
  date: string;
  temp_min: number;
  temp_max: number;
  temp_avg: number;
}

export default function ClimatologyChart() {
  const { intlLocale, messages } = useLocale();
  const [year, setYear] = useState(new Date().getFullYear());
  const [years, setYears] = useState<number[]>([]);
  const [data, setData] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/climatology?year=${year}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json.data ?? []);
        if (json.years?.length) {
          setYears(json.years);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year]);

  const fmtTick = (val: string) => {
    try {
      return new Date(val).toLocaleDateString(intlLocale, { month: "short" });
    } catch {
      return val;
    }
  };

  // Compute tick values: first data point of each month
  const monthTicks = data.reduce<string[]>((acc, d) => {
    try {
      const m = d.date.slice(0, 7); // "YYYY-MM"
      if (!acc.length || acc[acc.length - 1].slice(0, 7) !== m) {
        acc.push(d.date);
      }
    } catch {
      // skip
    }
    return acc;
  }, []);

  const fmtTooltip = (label: ReactNode): ReactNode => {
    if (typeof label === "string") {
      try {
        return new Date(label).toLocaleDateString(intlLocale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      } catch {
        return label;
      }
    }
    if (typeof label === "number") {
      return String(label);
    }
    return label;
  };

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-300">
          {messages.charts.climatology}
        </h3>
        <select
          value={year}
          onChange={(e) => {
            setLoading(true);
            setYear(Number(e.target.value));
          }}
          className="bg-slate-700 text-slate-200 text-xs rounded px-2 py-1 border border-slate-600 focus:outline-none focus:border-sky-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              tickFormatter={fmtTick}
              ticks={monthTicks}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              stroke="#475569"
            />
            <YAxis
              unit="°C"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              stroke="#475569"
            />
            <Tooltip
              labelFormatter={fmtTooltip}
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                color: "#e2e8f0",
              }}
              formatter={(
                value:
                  | string
                  | number
                  | readonly (string | number)[]
                  | undefined,
                name?: string | number,
              ) => [
                Array.isArray(value)
                  ? value.join(", ")
                  : typeof value === "number"
                    ? `${value.toFixed(1)} °C`
                    : typeof value === "string"
                      ? value
                      : "—",
                typeof name === "string"
                  ? name
                  : typeof name === "number"
                    ? name.toString()
                    : "",
              ]}
            />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="temp_max"
              name={messages.charts.dailyMax}
              stroke="#f87171"
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="temp_avg"
              name={messages.charts.dailyAvg}
              stroke="#a3e635"
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="temp_min"
              name={messages.charts.dailyMin}
              stroke="#38bdf8"
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
