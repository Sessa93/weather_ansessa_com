"use client";

import { useEffect, useState } from "react";

interface RecordSnapshot {
  high_temp: number | null;
  high_temp_recorded_at: string | null;
  low_temp: number | null;
  low_temp_recorded_at: string | null;
  avg_wind: number | null;
  high_wind: number | null;
  high_wind_recorded_at: string | null;
  total_rain: number | null;
  high_rain_rate: number | null;
  high_rain_rate_recorded_at: string | null;
}

interface RecordsData {
  today: RecordSnapshot;
  month: RecordSnapshot;
  year: RecordSnapshot;
}

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return Number(v).toFixed(1);
}

function fmtRecordedAt(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RecordSnapshots() {
  const [data, setData] = useState<RecordsData | null>(null);

  useEffect(() => {
    fetch("/api/records")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-700 rounded-2xl" />
          <div className="h-64 bg-slate-700 rounded-2xl" />
          <div className="h-64 bg-slate-700 rounded-2xl" />
        </div>
      </div>
    );
  }

  const todayLabel = "Today";
  const todaySub = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long" });
  const yearLabel = new Date().getFullYear().toString();

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-sky-400"
        >
          <path d="M12 2v20" />
          <path d="m2 12 5 5 5-5 5 5 5-5" />
          <path d="M5 22h14" />
          <path d="M5 2h14" />
        </svg>
        <h2 className="text-lg font-semibold text-slate-100">
          Weather Record Snapshots
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SnapshotCard
          title={todayLabel}
          subtitle={todaySub}
          data={data.today}
          accent="sky"
        />
        <SnapshotCard
          title={monthLabel}
          subtitle="Monthly totals"
          data={data.month}
          accent="purple"
        />
        <SnapshotCard
          title={yearLabel}
          subtitle="Annual summary"
          data={data.year}
          accent="indigo"
        />
      </div>
    </div>
  );
}

function SnapshotCard({
  title,
  subtitle,
  data,
  accent,
}: {
  title: string;
  subtitle: string;
  data: RecordSnapshot;
  accent: "sky" | "purple" | "indigo";
}) {
  const accentColors = {
    sky: "text-sky-400",
    purple: "text-purple-400",
    indigo: "text-indigo-400",
  };

  return (
    <div className="relative overflow-hidden bg-slate-900/40 border border-slate-700 rounded-2xl p-5 hover:bg-slate-900/60 transition-colors group">
      <div
        className={`absolute -right-4 -top-4 w-20 h-20 rounded-full bg-current opacity-[0.03] group-hover:opacity-[0.05] transition-opacity ${accentColors[accent]}`}
      />

      <div className="mb-4">
        <div
          className={`text-sm font-bold uppercase tracking-wider ${accentColors[accent]}`}
        >
          {title}
        </div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </div>

      <div className="space-y-4">
        {/* Temp section */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-2">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
            </svg>
            Temperature
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MetricBox
              label="High"
              value={`${fmt(data.high_temp)}°`}
              color="text-red-400"
              recordedAt={fmtRecordedAt(data.high_temp_recorded_at)}
            />
            <MetricBox
              label="Low"
              value={`${fmt(data.low_temp)}°`}
              color="text-blue-400"
              recordedAt={fmtRecordedAt(data.low_temp_recorded_at)}
            />
          </div>
        </div>

        {/* Wind section */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-2">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
              <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
              <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
            </svg>
            Wind Speed
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MetricBox
              label="Average"
              value={`${fmt(data.avg_wind)}`}
              unit="km/h"
            />
            <MetricBox
              label="Max Gust"
              value={`${fmt(data.high_wind)}`}
              unit="km/h"
              recordedAt={fmtRecordedAt(data.high_wind_recorded_at)}
            />
          </div>
        </div>

        {/* Rain section */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-2">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
              <path d="M16 14v6" />
              <path d="M8 14v6" />
              <path d="M12 16v6" />
            </svg>
            Precipitation
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MetricBox
              label="Total Rain"
              value={`${fmt(data.total_rain)}`}
              unit="mm"
            />
            <MetricBox
              label="Max Rate"
              value={`${fmt(data.high_rain_rate)}`}
              unit="mm/h"
              recordedAt={fmtRecordedAt(data.high_rain_rate_recorded_at)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  unit,
  recordedAt,
  color = "text-slate-200",
}: {
  label: string;
  value: string;
  unit?: string;
  recordedAt?: string;
  color?: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-2.5">
      <div className="text-[9px] uppercase font-bold text-slate-500 mb-0.5">
        {label}
      </div>
      <div className={`text-sm font-semibold ${color}`}>
        {value}
        {unit && (
          <span className="text-[10px] ml-0.5 text-slate-500 font-normal">
            {unit}
          </span>
        )}
      </div>
      {recordedAt && (
        <div className="mt-1 text-[10px] leading-tight text-slate-500">
          Recorded {recordedAt}
        </div>
      )}
    </div>
  );
}
