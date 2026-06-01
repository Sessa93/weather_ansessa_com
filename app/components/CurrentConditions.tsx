"use client";

import { useEffect, useRef, useState } from "react";
import type { CurrentConditions } from "@/lib/types";
import { useLiveWeather } from "@/lib/useLiveWeather";
import WeatherIcon from "./WeatherIcon";
import { useLocale } from "./LocaleProvider";
import { translateCurrentCondition } from "@/lib/i18n";

function windDirection(deg: number | null | undefined): string {
  if (deg === null || deg === undefined) return "";
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

export default function CurrentConditionsPanel() {
  const { locale, intlLocale, messages } = useLocale();
  const [data, setData] = useState<CurrentConditions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { patch, connected } = useLiveWeather();
  const connectionError = messages.current.connectionError;

  const fmt = (val: number | null | undefined, decimals: number) => {
    if (val === null || val === undefined) return messages.common.unavailable;
    return val.toFixed(decimals);
  };

  const fmtRecordedAt = (value: string | null | undefined) => {
    if (!value) return `${messages.common.recorded} —`;
    return `${messages.common.recorded} ${new Date(value).toLocaleString(
      intlLocale,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      },
    )}`;
  };

  // Fetch once on mount; live updates come via MQTT
  useEffect(() => {
    fetch("/api/current")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch(() => setError(connectionError));

    // Ask the WLL to start broadcasting UDP packets for 5 minutes
    fetch("/api/start-live", { method: "POST" }).catch(() => {});
  }, [connectionError]);

  // Merge live MQTT patch (wind + rain) over the HTTP baseline
  const display = data
    ? {
        ...data,
        wind_speed: patch?.wind_speed ?? data.wind_speed,
        wind_dir: patch?.wind_dir ?? data.wind_dir,
        wind_gust: patch?.wind_gust ?? data.wind_gust,
        rain_rate: patch?.rain_rate ?? data.rain_rate,
        rain_today: patch?.rain_today ?? data.rain_today,
        timestamp: patch
          ? new Date(patch.ts * 1000).toISOString()
          : data.timestamp,
      }
    : null;

  if (error) {
    return (
      <div className="bg-red-900/40 border border-red-800 rounded-lg p-6 text-center text-red-300">
        {error}
      </div>
    );
  }

  if (!display) {
    return (
      <div className="bg-slate-800 rounded-lg shadow p-6 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="h-16 bg-slate-700 rounded w-1/4 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-slate-700 rounded" />
          <div className="h-20 bg-slate-700 rounded" />
          <div className="h-20 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  const timestamp = new Date(display.timestamp).toLocaleString(intlLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700">
      {/* Status bar */}
      <div className="bg-slate-950 text-slate-300 px-4 py-2 text-sm flex items-center gap-2 border-b border-slate-700">
        <span
          className={`inline-block w-2 h-2 rounded-full animate-pulse ${
            connected ? "bg-green-400" : "bg-yellow-400"
          }`}
        />
        {connected
          ? `${messages.current.live} · `
          : `${messages.current.lastKnown} · `}
        {timestamp}
      </div>

      {/* Main current conditions */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Weather Icon */}
          <div className="bg-slate-700/30 p-4 rounded-full border border-slate-600">
            <WeatherIcon condition={display.condition} className="w-16 h-16" />
          </div>

          {/* Big temperature */}
          <div className="flex items-center gap-4">
            <div className="text-6xl font-light text-slate-100">
              {fmt(display.temp, 1)}
              <span className="text-3xl text-slate-400">°C</span>
            </div>
          </div>

          {/* Condition + feels like */}
          <div>
            <div className="text-xl font-medium text-slate-200">
              {translateCurrentCondition(display.condition, locale)}
            </div>
            <div className="text-sm text-slate-400">
              {messages.current.feelsLike}: {fmt(display.feels_like, 1)} °C
            </div>
          </div>

          {/* High / Low */}
          <div className="ml-auto flex gap-4">
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">
                {messages.current.high}
              </div>
              <div className="text-lg font-medium text-red-400">
                {fmt(display.high, 1)} °C
              </div>
              <div className="mt-1 text-[10px] leading-tight text-slate-500">
                {fmtRecordedAt(display.high_recorded_at)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">
                {messages.current.low}
              </div>
              <div className="text-lg font-medium text-blue-400">
                {fmt(display.low, 1)} °C
              </div>
              <div className="mt-1 text-[10px] leading-tight text-slate-500">
                {fmtRecordedAt(display.low_recorded_at)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {/* Wind compass – spans 2 columns */}
          <div className="col-span-2 bg-slate-700/50 rounded-lg p-3 flex items-center gap-4">
            <WindCompass
              dir={display.wind_dir}
              speed={display.wind_speed}
              gust={display.wind_gust}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400 uppercase font-semibold mb-1">
                {messages.current.wind}
              </div>
              <div className="text-base font-medium text-slate-100">
                {fmt(display.wind_speed, 0)} km/h{" "}
                <span className="text-slate-400">
                  {windDirection(display.wind_dir)}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {messages.current.gust}: {fmt(display.wind_gust, 0)} km/h
              </div>
            </div>
          </div>
          <MetricCard
            label={messages.current.barometer}
            value={`${fmt(display.barometer, 1)} mbar`}
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 7v5l3 3" />
              </svg>
            }
          />
          <MetricCard
            label={messages.current.dewPoint}
            value={`${fmt(display.dew_point, 1)} °C`}
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
              </svg>
            }
          />
          <MetricCard
            label={messages.current.humidity}
            value={`${fmt(display.humidity, 0)}%`}
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
              </svg>
            }
          />
          <MetricCard
            label={messages.current.rainToday}
            value={`${fmt(display.rain_today, 1)} mm`}
            sub={`${messages.current.rate}: ${fmt(display.rain_rate, 1)} mm/hr`}
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                <path d="M16 14v6" />
                <path d="M8 14v6" />
                <path d="M12 16v6" />
              </svg>
            }
          />
          <MetricCard
            label={messages.current.sunrise}
            value={display.sunrise}
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v8" />
                <path d="m4.93 10.93 1.41-1.41" />
                <path d="M2 18h2" />
                <path d="M20 18h2" />
                <path d="m19.07 10.93-1.41-1.41" />
                <path d="M22 22H2" />
                <path d="m8 22 4-4 4 4" />
              </svg>
            }
          />
          <MetricCard
            label={messages.current.sunset}
            value={display.sunset}
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 10V2" />
                <path d="m4.93 10.93 1.41-1.41" />
                <path d="M2 18h2" />
                <path d="M20 18h2" />
                <path d="m19.07 10.93-1.41-1.41" />
                <path d="M22 22H2" />
                <path d="m16 22-4-4-4 4" />
              </svg>
            }
          />
          <MetricCard
            label={messages.current.moon}
            value={display.moon_phase}
            sub={`${display.moon_visible}% ${messages.current.visible}`}
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

function WindCompass({
  dir,
  speed,
  gust,
}: {
  dir: number | null | undefined;
  speed: number | null | undefined;
  gust: number | null | undefined;
}) {
  const hasDir = dir !== null && dir !== undefined;
  const prevAngle = useRef(dir ?? 0);

  // Compute the shortest-path rotation so the arrow never spins the long way
  if (hasDir) {
    let delta = (dir - prevAngle.current) % 360;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    prevAngle.current += delta;
  }

  const size = 80;
  const cx = size / 2;
  const cy = size / 2;
  const r = 34;
  const labels: [string, number][] = [
    ["N", 0],
    ["E", 90],
    ["S", 180],
    ["W", 270],
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
    >
      {/* outer ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#475569"
        strokeWidth="1"
      />
      {/* tick marks for 16 directions */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * 22.5 - 90) * (Math.PI / 180);
        const isMajor = i % 4 === 0;
        const inner = isMajor ? r - 6 : r - 4;
        return (
          <line
            key={i}
            x1={cx + inner * Math.cos(angle)}
            y1={cy + inner * Math.sin(angle)}
            x2={cx + r * Math.cos(angle)}
            y2={cy + r * Math.sin(angle)}
            stroke={isMajor ? "#94a3b8" : "#64748b"}
            strokeWidth={isMajor ? 1.5 : 0.75}
          />
        );
      })}
      {/* N / E / S / W labels */}
      {labels.map(([label, deg]) => {
        const angle = (deg - 90) * (Math.PI / 180);
        const lr = r + 7;
        return (
          <text
            key={label}
            x={cx + lr * Math.cos(angle)}
            y={cy + lr * Math.sin(angle)}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-400 text-[8px] font-semibold"
          >
            {label}
          </text>
        );
      })}
      {/* direction arrow */}
      {hasDir && (
        <g
          style={{
            transform: `rotate(${prevAngle.current}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {" "}
          <line
            x1={cx}
            y1={cy + 12}
            x2={cx}
            y2={cy - r + 8}
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <polygon
            points={`${cx},${cy - r + 4} ${cx - 4},${cy - r + 12} ${cx + 4},${cy - r + 12}`}
            fill="#38bdf8"
          />
          {/* tail */}
          <circle cx={cx} cy={cy} r="3" fill="#38bdf8" opacity="0.6" />
        </g>
      )}
      {/* calm / no data indicator */}
      {!hasDir && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-500 text-[10px]"
        >
          —
        </text>
      )}
    </svg>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-3 flex items-start gap-3">
      {icon && <div className="mt-1 text-slate-400 shrink-0">{icon}</div>}
      <div className="flex-1">
        <div className="text-xs text-slate-400 uppercase font-semibold mb-1">
          {label}
        </div>
        <div className="text-base font-medium text-slate-100 break-words">
          {value}
        </div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
