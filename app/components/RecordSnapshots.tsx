"use client";

import { useEffect, useState } from "react";

interface RecordSnapshot {
  high_temp: number | null;
  low_temp: number | null;
  avg_wind: number | null;
  high_wind: number | null;
  total_rain: number | null;
  high_rain_rate: number | null;
}

interface RecordsData {
  today: RecordSnapshot;
  month: RecordSnapshot;
}

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return Number(v).toFixed(1);
}

export default function RecordSnapshots() {
  const [data, setData] = useState<RecordsData | null>(null);

  useEffect(() => {
    fetch("/api/records")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const monthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">
        Weather Record Snapshots
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SnapshotCard title={today} data={data.today} />
        <SnapshotCard title={monthLabel} data={data.month} />
      </div>
    </div>
  );
}

function SnapshotCard({
  title,
  data,
}: {
  title: string;
  data: RecordSnapshot;
}) {
  return (
    <div className="border border-slate-600 rounded-lg p-3 bg-slate-700/40">
      <div className="text-xs font-semibold text-sky-400 mb-2">{title}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <Row label="High" value={`${fmt(data.high_temp)} °C`} />
        <Row label="Low" value={`${fmt(data.low_temp)} °C`} />
        <Row label="Avg Wind" value={`${fmt(data.avg_wind)} km/h`} />
        <Row label="Max Wind" value={`${fmt(data.high_wind)} km/h`} />
        <Row label="Rain" value={`${fmt(data.total_rain)} mm`} />
        <Row label="Max Rate" value={`${fmt(data.high_rain_rate)} mm/hr`} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-slate-400">{label}:</span>
      <span className="font-medium text-slate-200">{value}</span>
    </>
  );
}
