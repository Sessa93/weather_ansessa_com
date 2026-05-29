"use client";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
} from "recharts";

interface Reading {
  wind_speed: number | null;
  wind_gust: number | null;
  wind_dir: number | null;
}

const DIRECTIONS = [
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
] as const;

const CARDINAL = new Set(["N", "E", "S", "W"]);

const SPEED_BINS = [
  {
    key: "fresh",
    label: "Fresh",
    range: "25–40 km/h",
    max: 40,
    color: "#fbbf24",
    glow: "#fbbf2440",
  },
  {
    key: "strong",
    label: "Strong",
    range: "> 40 km/h",
    max: Infinity,
    color: "#f87171",
    glow: "#f8717140",
  },
] as const;

function degToDirIndex(deg: number): number {
  return Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
}

export default function WindRose({ data }: { data: Reading[] }) {
  const { chartData, dominantDir, avgSpeed, maxGust, calmPct } = useMemo(() => {
    const bins: Record<string, Record<string, number>> = {};
    for (const dir of DIRECTIONS) {
      bins[dir] = {};
      for (const sb of SPEED_BINS) {
        bins[dir][sb.key] = 0;
      }
    }

    const valid = data.filter(
      (r) => r.wind_dir != null && r.wind_speed != null,
    );
    const total = valid.length || 1;

    let sumSpeed = 0;
    let maxG = 0;
    const dirCounts: Record<string, number> = {};
    for (const dir of DIRECTIONS) dirCounts[dir] = 0;

    for (const r of valid) {
      const speed = r.wind_speed ?? 0;
      const gust = r.wind_gust ?? 0;
      sumSpeed += speed;
      if (gust > maxG) maxG = gust;
      const dirIdx = degToDirIndex(r.wind_dir ?? 0);
      const dir = DIRECTIONS[dirIdx];
      dirCounts[dir]++;
      for (const sb of SPEED_BINS) {
        if (speed < sb.max) {
          bins[dir][sb.key]++;
          break;
        }
      }
    }

    const chartData = DIRECTIONS.map((dir) => {
      const entry: Record<string, string | number> = { direction: dir };
      for (const sb of SPEED_BINS) {
        entry[sb.key] = +((bins[dir][sb.key] / total) * 100).toFixed(1);
      }
      return entry;
    });

    // Find dominant direction
    let domDir = "N";
    let domCount = 0;
    for (const [dir, count] of Object.entries(dirCounts)) {
      if (count > domCount) {
        domCount = count;
        domDir = dir;
      }
    }

    const calmCount = valid.filter((r) => (r.wind_speed ?? 0) < 5).length;

    return {
      chartData,
      dominantDir: domDir,
      avgSpeed: valid.length ? +(sumSpeed / valid.length).toFixed(1) : 0,
      maxGust: +maxG.toFixed(1),
      calmPct: +((calmCount / total) * 100).toFixed(0),
    };
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">Wind Rose</h3>
        <div className="flex gap-3 text-[11px] text-slate-400">
          <span>
            Avg <span className="text-sky-400 font-medium">{avgSpeed}</span>{" "}
            km/h
          </span>
          <span>
            Gust <span className="text-amber-400 font-medium">{maxGust}</span>{" "}
            km/h
          </span>
          <span>
            Dom{" "}
            <span className="text-emerald-400 font-medium">{dominantDir}</span>
          </span>
        </div>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
            <PolarGrid
              stroke="#334155"
              strokeDasharray="2 4"
              strokeOpacity={0.6}
            />
            <PolarAngleAxis
              dataKey="direction"
              tick={(props) => {
                const { x, y, payload } = props;
                const isCardinal = payload && CARDINAL.has(payload.value);
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isCardinal ? "#e2e8f0" : "#64748b"}
                    fontSize={isCardinal ? 13 : 10}
                    fontWeight={isCardinal ? 600 : 400}
                  >
                    {payload?.value}
                  </text>
                );
              }}
            />
            <PolarRadiusAxis
              tick={{ fontSize: 9, fill: "#475569" }}
              tickFormatter={(v: number) => `${v}%`}
              angle={90}
              stroke="transparent"
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 10,
                color: "#e2e8f0",
                fontSize: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
              formatter={(
                value:
                  | number
                  | string
                  | readonly (string | number)[]
                  | undefined,
                name?: string | number,
              ) => {
                const bin = SPEED_BINS.find((b) => b.key === name);
                return [
                  <span key={String(name)} style={{ color: bin?.color }}>
                    {typeof value === "number" ? `${value}%` : (value ?? "—")}
                  </span>,
                  bin?.range ?? String(name),
                ];
              }}
              labelStyle={{
                color: "#94a3b8",
                fontWeight: 600,
                marginBottom: 4,
              }}
            />
            {[...SPEED_BINS].reverse().map((sb) => (
              <Radar
                key={sb.key}
                name={sb.key}
                dataKey={sb.key}
                stroke={sb.color}
                fill={sb.color}
                fillOpacity={0.35}
                strokeWidth={1.5}
                dot={false}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>

        {/* Center calm indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center bg-slate-900/80 rounded-full w-16 h-16 justify-center border border-slate-700/50">
            <span className="text-lg font-bold text-slate-200 leading-none">
              {calmPct}%
            </span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">
              calm
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 mt-2 flex-wrap">
        {SPEED_BINS.map((sb) => (
          <div key={sb.key} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: sb.color,
                boxShadow: `0 0 6px ${sb.glow}`,
              }}
            />
            <span className="text-[10px] text-slate-400">{sb.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
