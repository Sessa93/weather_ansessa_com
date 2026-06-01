"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "./LocaleProvider";

interface DayData {
  date: string;
  value: number;
}

type Metric =
  | "avg_temp"
  | "high_temp"
  | "low_temp"
  | "total_rain"
  | "avg_humidity";

const CELL = 13;
const GAP = 2;
const TOTAL = CELL + GAP;

function getColor(value: number, min: number, max: number, metric: Metric) {
  const range = max - min || 1;
  const t = Math.max(0, Math.min(1, (value - min) / range));

  if (metric === "total_rain") {
    // Blue scale for rain
    const b = Math.round(100 + t * 155);
    return `rgb(${Math.round(30 + (1 - t) * 100)}, ${Math.round(60 + (1 - t) * 100)}, ${b})`;
  }

  if (metric === "avg_humidity") {
    // Teal scale
    const g = Math.round(100 + t * 155);
    return `rgb(${Math.round(20 + (1 - t) * 50)}, ${g}, ${Math.round(130 + t * 80)})`;
  }

  // Temperature: blue → green → yellow → red
  if (t < 0.25) {
    const s = t / 0.25;
    return `rgb(${Math.round(59 + s * 0)}, ${Math.round(130 + s * 70)}, ${Math.round(246 - s * 46)})`;
  }
  if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return `rgb(${Math.round(59 + s * 190)}, ${Math.round(200 - s * 10)}, ${Math.round(200 - s * 150)})`;
  }
  if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return `rgb(${Math.round(249 + s * 0)}, ${Math.round(190 - s * 50)}, ${Math.round(50 - s * 20)})`;
  }
  const s = (t - 0.75) / 0.25;
  return `rgb(${Math.round(249 - s * 10)}, ${Math.round(140 - s * 80)}, ${Math.round(30 - s * 20)})`;
}

export default function HeatmapCalendar() {
  const { messages, intlLocale } = useLocale();
  const [data, setData] = useState<DayData[]>([]);
  const [metric, setMetric] = useState<Metric>("avg_temp");
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    value: number;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/heatmap?metric=${metric}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [metric]);

  const { grid, weeks, min, max, monthLabels } = useMemo(() => {
    if (data.length === 0)
      return { grid: [], weeks: 0, min: 0, max: 0, monthLabels: [] };

    const map = new Map(data.map((d) => [d.date, d.value]));
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Fill 52 weeks ending today
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const grid: {
      date: string;
      value: number | null;
      week: number;
      day: number;
    }[] = [];
    const monthLabels: { label: string; week: number }[] = [];
    let lastMonth = -1;

    const d = new Date(startDate);
    while (d <= today) {
      const week = Math.floor(
        (d.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      const day = d.getDay();
      const dateStr = d.toISOString().slice(0, 10);

      if (d.getMonth() !== lastMonth) {
        monthLabels.push({
          label: d.toLocaleDateString(intlLocale, { month: "short" }),
          week,
        });
        lastMonth = d.getMonth();
      }

      grid.push({
        date: dateStr,
        value: map.get(dateStr) ?? null,
        week,
        day,
      });

      d.setDate(d.getDate() + 1);
    }

    const weeks =
      Math.floor(
        (today.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
      ) + 1;

    return { grid, weeks, min, max, monthLabels };
  }, [data, intlLocale]);

  const metrics: { value: Metric; label: string }[] = [
    { value: "avg_temp", label: messages.charts.temperature },
    { value: "total_rain", label: messages.charts.rain },
    { value: "avg_humidity", label: messages.charts.humidity },
  ];

  const svgW = weeks * TOTAL + 30;
  const svgH = 7 * TOTAL + 25;

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">
          {messages.charts.heatmap}
        </h3>
        <div className="flex gap-1">
          {metrics.map((m) => (
            <button
              key={m.value}
              onClick={() => setMetric(m.value)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                metric === m.value
                  ? "bg-sky-600 text-white"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto relative">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full"
          style={{ minHeight: svgH, maxHeight: svgH * 1.5 }}
          preserveAspectRatio="xMinYMid meet"
        >
          {/* Month labels */}
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={30 + m.week * TOTAL}
              y={10}
              className="fill-slate-500 text-[9px]"
            >
              {m.label}
            </text>
          ))}
          {/* Day labels */}
          {["M", "W", "F"].map((label, i) => (
            <text
              key={label}
              x={0}
              y={20 + [1, 3, 5][i] * TOTAL + CELL / 2}
              dominantBaseline="central"
              className="fill-slate-500 text-[9px]"
            >
              {label}
            </text>
          ))}
          {/* Cells */}
          {grid.map((cell, i) => (
            <rect
              key={i}
              x={30 + cell.week * TOTAL}
              y={15 + cell.day * TOTAL}
              width={CELL}
              height={CELL}
              rx={2}
              fill={
                cell.value !== null
                  ? getColor(cell.value, min, max, metric)
                  : "#1e293b"
              }
              stroke="#0f172a"
              strokeWidth={1}
              className="cursor-pointer"
              onMouseEnter={(e) => {
                if (cell.value !== null) {
                  const rect = (
                    e.target as SVGRectElement
                  ).getBoundingClientRect();
                  setTooltip({
                    x: rect.x + rect.width / 2,
                    y: rect.y,
                    date: cell.date,
                    value: cell.value,
                  });
                }
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
        </svg>
        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 shadow-lg"
            style={{
              left: tooltip.x,
              top: tooltip.y - 30,
              transform: "translateX(-50%)",
            }}
          >
            {new Date(tooltip.date).toLocaleDateString(intlLocale, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            : <strong>{tooltip.value}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
