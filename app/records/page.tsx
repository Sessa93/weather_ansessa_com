"use client";

import { useEffect, useState } from "react";
import { useLocale } from "../components/LocaleProvider";

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
  high_humidity: number | null;
  high_humidity_recorded_at: string | null;
  low_humidity: number | null;
  low_humidity_recorded_at: string | null;
  high_barometer: number | null;
  high_barometer_recorded_at: string | null;
  low_barometer: number | null;
  low_barometer_recorded_at: string | null;
}

interface AllTimeEntry {
  value: number;
  recorded_at: string;
}

interface RecordsData {
  today: RecordSnapshot;
  month: RecordSnapshot;
  year: RecordSnapshot;
  allTime: Record<string, AllTimeEntry>;
  monthlyRain: { month: string; total_rain: number }[];
}

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return Number(v).toFixed(1);
}

function fmtDate(d: string | null | undefined, intlLocale: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleString(intlLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RecordsPage() {
  const { intlLocale, messages } = useLocale();
  const [data, setData] = useState<RecordsData | null>(null);

  useEffect(() => {
    fetch("/api/records")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-100 mb-6">
          {messages.records.title}
        </h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6 h-40"
            />
          ))}
        </div>
      </div>
    );
  }

  const yearLabel = new Date().getFullYear().toString();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">
        {messages.records.title}
      </h1>

      {/* Temperature Records */}
      <RecordTable title={messages.records.temperatureRecords}>
        <RecordRow
          label={messages.records.highestTemperature}
          yearVal={`${fmt(data.year?.high_temp)} °C`}
          yearDate={fmtDate(data.year?.high_temp_recorded_at, intlLocale)}
          allTimeVal={
            data.allTime.highest_temp
              ? `${fmt(data.allTime.highest_temp.value)} °C`
              : "—"
          }
          allTimeDate={fmtDate(
            data.allTime.highest_temp?.recorded_at,
            intlLocale,
          )}
        />
        <RecordRow
          label={messages.records.lowestTemperature}
          yearVal={`${fmt(data.year?.low_temp)} °C`}
          yearDate={fmtDate(data.year?.low_temp_recorded_at, intlLocale)}
          allTimeVal={
            data.allTime.lowest_temp
              ? `${fmt(data.allTime.lowest_temp.value)} °C`
              : "—"
          }
          allTimeDate={fmtDate(
            data.allTime.lowest_temp?.recorded_at,
            intlLocale,
          )}
        />
      </RecordTable>

      {/* Wind Records */}
      <RecordTable title={messages.records.windRecords}>
        <RecordRow
          label={messages.records.strongestWindGust}
          yearVal={`${fmt(data.year?.high_wind)} km/h`}
          yearDate={fmtDate(data.year?.high_wind_recorded_at, intlLocale)}
          allTimeVal={
            data.allTime.highest_wind
              ? `${fmt(data.allTime.highest_wind.value)} km/h`
              : "—"
          }
          allTimeDate={fmtDate(
            data.allTime.highest_wind?.recorded_at,
            intlLocale,
          )}
        />
      </RecordTable>

      {/* Rain Records */}
      <RecordTable title={messages.records.rainRecords}>
        <RecordRow
          label={messages.records.highestDailyRainRate}
          yearVal={`${fmt(data.year?.high_rain_rate)} mm/hr`}
          yearDate={fmtDate(data.year?.high_rain_rate_recorded_at, intlLocale)}
          allTimeVal={
            data.allTime.highest_rain_rate
              ? `${fmt(data.allTime.highest_rain_rate.value)} mm/hr`
              : "—"
          }
          allTimeDate={fmtDate(
            data.allTime.highest_rain_rate?.recorded_at,
            intlLocale,
          )}
        />
        <RecordRow
          label={messages.records.totalRainfall}
          yearVal={`${fmt(data.year?.total_rain)} mm`}
          yearDate={yearLabel}
          allTimeVal="—"
          allTimeDate="—"
        />
      </RecordTable>

      {/* Humidity Records */}
      <RecordTable title={messages.records.humidityRecords}>
        <RecordRow
          label={messages.records.highestHumidity}
          yearVal={
            data.year.high_humidity ? `${fmt(data.year.high_humidity)}%` : "—"
          }
          yearDate={fmtDate(data.year.high_humidity_recorded_at, intlLocale)}
          allTimeVal={
            data.allTime.highest_humidity
              ? `${fmt(data.allTime.highest_humidity.value)}%`
              : "—"
          }
          allTimeDate={fmtDate(
            data.allTime.highest_humidity?.recorded_at,
            intlLocale,
          )}
        />
        <RecordRow
          label={messages.records.lowestHumidity}
          yearVal={
            data.year.low_humidity ? `${fmt(data.year.low_humidity)}%` : "—"
          }
          yearDate={fmtDate(data.year.low_humidity_recorded_at, intlLocale)}
          allTimeVal={
            data.allTime.lowest_humidity
              ? `${fmt(data.allTime.lowest_humidity.value)}%`
              : "—"
          }
          allTimeDate={fmtDate(
            data.allTime.lowest_humidity?.recorded_at,
            intlLocale,
          )}
        />
      </RecordTable>

      {/* Barometer Records */}
      <RecordTable title={messages.records.barometerRecords}>
        <RecordRow
          label={messages.records.highestBarometer}
          yearVal={
            data.year.high_barometer
              ? `${fmt(data.year.high_barometer)} mbar`
              : "—"
          }
          yearDate={fmtDate(data.year.high_barometer_recorded_at, intlLocale)}
          allTimeVal={
            data.allTime.highest_barometer
              ? `${fmt(data.allTime.highest_barometer.value)} mbar`
              : "—"
          }
          allTimeDate={fmtDate(
            data.allTime.highest_barometer?.recorded_at,
            intlLocale,
          )}
        />
        <RecordRow
          label={messages.records.lowestBarometer}
          yearVal={
            data.year.low_barometer
              ? `${fmt(data.year.low_barometer)} mbar`
              : "—"
          }
          yearDate={fmtDate(data.year.low_barometer_recorded_at, intlLocale)}
          allTimeVal={
            data.allTime.lowest_barometer
              ? `${fmt(data.allTime.lowest_barometer.value)} mbar`
              : "—"
          }
          allTimeDate={fmtDate(
            data.allTime.lowest_barometer?.recorded_at,
            intlLocale,
          )}
        />
      </RecordTable>
    </div>
  );
}

function RecordTable({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { messages } = useLocale();

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
      <div className="bg-slate-950 text-sky-400 px-4 py-2 text-sm font-semibold border-b border-slate-700">
        {title}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/50">
            <th className="text-left px-4 py-2 text-slate-400 font-medium" />
            <th
              className="text-center px-4 py-2 text-slate-400 font-medium"
              colSpan={2}
            >
              {new Date().getFullYear()}
            </th>
            <th
              className="text-center px-4 py-2 text-slate-400 font-medium"
              colSpan={2}
            >
              {messages.common.allTime}
            </th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function RecordRow({
  label,
  yearVal,
  yearDate,
  allTimeVal,
  allTimeDate,
}: {
  label: string;
  yearVal: string;
  yearDate: string;
  allTimeVal: string;
  allTimeDate: string;
}) {
  return (
    <tr className="border-b border-slate-700/50 hover:bg-slate-700/30">
      <td className="px-4 py-2 text-slate-300 font-medium">{label}</td>
      <td className="px-4 py-2 text-center text-slate-200 font-semibold">
        {yearVal}
      </td>
      <td className="px-4 py-2 text-center text-slate-500 text-xs">
        {yearDate}
      </td>
      <td className="px-4 py-2 text-center text-slate-200 font-semibold">
        {allTimeVal}
      </td>
      <td className="px-4 py-2 text-center text-slate-500 text-xs">
        {allTimeDate}
      </td>
    </tr>
  );
}
