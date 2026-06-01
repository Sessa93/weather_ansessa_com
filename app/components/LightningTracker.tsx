"use client";

import { useEffect, useState } from "react";
import { useLocale } from "./LocaleProvider";

interface LightningData {
  strikes: { lat: number; lon: number; time: number; distance_km: number }[];
  count: number;
  radius_km: number;
}

export default function LightningTracker() {
  const { messages } = useLocale();
  const [data, setData] = useState<LightningData | null>(null);

  useEffect(() => {
    const fetchData = () => {
      fetch("/api/lightning")
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    };

    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!data || data.count === 0) return null;

  const nearest = data.strikes[0];

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl">⚡</div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-300">
            {messages.lightning.title}
          </h3>
          <div className="text-base font-medium text-amber-300">
            {data.count} {messages.lightning.strikes}
          </div>
          <div className="text-xs text-slate-400">
            {messages.lightning.nearest}: {nearest.distance_km} km ·{" "}
            {messages.lightning.within} {data.radius_km} km
          </div>
        </div>
        {/* Simple radar-style mini visualization */}
        <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
          {/* Concentric rings */}
          {[12, 24, 30].map((r) => (
            <circle
              key={r}
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke="#334155"
              strokeWidth="0.5"
            />
          ))}
          {/* Center (station) */}
          <circle cx="32" cy="32" r="2" fill="#38bdf8" />
          {/* Strike dots */}
          {data.strikes.slice(0, 20).map((s, i) => {
            // Place proportionally within the 50km radius → 30px
            const scale = (s.distance_km / data.radius_km) * 30;
            const angle = Math.atan2(s.lat - 45.71, s.lon - 8.79) + Math.PI / 2;
            const x = 32 + scale * Math.cos(angle);
            const y = 32 - scale * Math.sin(angle);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.5"
                fill="#fbbf24"
                opacity={0.8}
              >
                <animate
                  attributeName="opacity"
                  values="0.8;0.3;0.8"
                  dur="2s"
                  repeatCount="indefinite"
                  begin={`${i * 0.1}s`}
                />
              </circle>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
