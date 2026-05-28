"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface MonthData {
  month: number;
  total: number;
}

export default function MonthlyRainChart() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [years, setYears] = useState<number[]>([]);
  const [data, setData] = useState<{ name: string; rain: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (y: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rain-by-month?year=${y}`);
      const json = await res.json();

      // Build full 12-month array, filling missing months with 0
      const byMonth = new Map<number, number>();
      json.months.forEach((m: MonthData) => byMonth.set(m.month, m.total));

      setData(
        MONTH_LABELS.map((name, i) => ({
          name,
          rain: byMonth.get(i + 1) ?? 0,
        })),
      );

      if (json.years?.length) setYears(json.years);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(year);
  }, [year, fetchData]);

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-300">
          Monthly Rainfall
        </h3>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
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
              formatter={(value: number) => [`${value.toFixed(1)} mm`, "Rain"]}
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                color: "#e2e8f0",
              }}
            />
            <Bar
              dataKey="rain"
              name="Rain"
              fill="#38bdf8"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
