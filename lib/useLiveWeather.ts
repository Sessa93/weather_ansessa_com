"use client";

import { useEffect, useState } from "react";

export interface LivePatch {
  ts: number;
  wind_speed: number | null;
  wind_dir: number | null;
  wind_gust: number | null;
  rain_rate: number | null;
  rain_today: number | null;
  rain_monthly: number | null;
  rain_yearly: number | null;
}

export function useLiveWeather() {
  const [patch, setPatch] = useState<LivePatch | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/live");

    es.onmessage = (e) => {
      try {
        setPatch(JSON.parse(e.data) as LivePatch);
        setConnected(true);
      } catch {}
    };
    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

  return { patch, connected };
}
