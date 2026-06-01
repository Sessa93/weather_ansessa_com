"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLocale } from "./LocaleProvider";

interface MonthData {
  month: number;
  total: number;
}

export default function MonthlyRainChart() {
  const { intlLocale, messages } = useLocale();
  const [year, setYear] = useState(new Date().getFullYear());
  const [years, setYears] = useState<number[]>([]);
  const [data, setData] = useState<{ name: string; rain: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const monthFormatter = new Intl.DateTimeFormat(intlLocale, {
      month: "short",
    });

    fetch(`/api/rain-by-month?year=${year}`)
      .then((res) => res.json())
      .then((json) => {
        const byMonth = new Map<number, number>();
        json.months.forEach((month: MonthData) =>
          byMonth.set(month.month, month.total),
        );

        setData(
          Array.from({ length: 12 }, (_, i) => ({
            name: monthFormatter.format(new Date(year, i, 1)),
            rain: byMonth.get(i + 1) ?? 0,
          })),
        );

        if (json.years?.length) {
          setYears(json.years);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, intlLocale]);

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-300">
          {messages.charts.monthlyRainfall}
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
        <div className="h-[260px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              stroke="#475569"
            />
            <YAxis
              unit=" mm"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              stroke="#475569"
            />
            <Tooltip
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
                    ? `${value.toFixed(1)} mm`
                    : typeof value === "string"
                      ? value
                      : "—",
                typeof name === "string"
                  ? name
                  : typeof name === "number"
                    ? name.toString()
                    : messages.charts.rainLabel,
              ]}
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                color: "#e2e8f0",
              }}
            />
            <Bar
              dataKey="rain"
              name={messages.charts.rainLabel}
              fill="#38bdf8"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
