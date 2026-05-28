"use client";

import { useEffect, useState, useCallback } from "react";
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
import { format, parseISO } from "date-fns";

interface DayRow {
  date: string;
  temp_min: number;
  temp_max: number;
  temp_avg: number;
}

export default function ClimatologyChart() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [years, setYears] = useState<number[]>([]);
  const [data, setData] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (y: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/climatology?year=${y}`);
      const json = await res.json();
      setData(json.data ?? []);
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

  const fmtTick = (val: string) => {
    try {
      return format(parseISO(val), "MMM");
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

  const fmtTooltip = (val: string) => {
    try {
      return format(parseISO(val), "d MMM yyyy");
    } catch {
      return val;
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-300">
          Average Climatological Values
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
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)} °C`,
                name,
              ]}
            />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="temp_max"
              name="Daily Max"
              stroke="#f87171"
              dot={false}
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey="temp_avg"
              name="Daily Avg"
              stroke="#a3e635"
              dot={false}
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey="temp_min"
              name="Daily Min"
              stroke="#38bdf8"
              dot={false}
              strokeWidth={1.5}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
