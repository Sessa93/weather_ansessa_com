import { NextResponse } from "next/server";

// Jerago con Orago coordinates
const STATION_LAT = 45.71;
const STATION_LON = 8.79;
const RADIUS_KM = 50;

interface Strike {
  lat: number;
  lon: number;
  time: number;
  distance_km: number;
}

// In-memory cache (Blitzortung rate-limits)
let cache: { data: Strike[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 60_000; // 1 minute

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET() {
  const now = Date.now();

  if (now - cache.ts < CACHE_TTL) {
    return NextResponse.json({
      strikes: cache.data,
      count: cache.data.length,
      radius_km: RADIUS_KM,
      cached: true,
    });
  }

  try {
    // Blitzortung public GeoJSON endpoint for recent strikes
    // Uses map tile-style endpoint for the region around the station
    const response = await fetch(
      `https://map.blitzortung.org/GEOjson/GEOjson.php?` +
        `north=${STATION_LAT + 1}&south=${STATION_LAT - 1}` +
        `&west=${STATION_LON - 1}&east=${STATION_LON + 1}` +
        `&number=100&sig=0`,
      {
        headers: {
          "User-Agent": "WeatherStation/1.0",
          Referer: "https://map.blitzortung.org/",
        },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      return NextResponse.json({
        strikes: [],
        count: 0,
        radius_km: RADIUS_KM,
        error: "Blitzortung API unavailable",
      });
    }

    const text = await response.text();

    // Parse Blitzortung response (JSON array of [lon, lat, time_ns])
    let strikes: Strike[] = [];
    try {
      const json = JSON.parse(text);
      const features = json.features || json;

      if (Array.isArray(features)) {
        strikes = features
          .map(
            (f: {
              geometry?: { coordinates?: number[] };
              properties?: { time?: number };
            }) => {
              const coords = f.geometry?.coordinates;
              if (!coords || coords.length < 2) return null;
              const [lon, lat] = coords;
              const distance = haversine(STATION_LAT, STATION_LON, lat, lon);
              if (distance > RADIUS_KM) return null;
              return {
                lat,
                lon,
                time: f.properties?.time ?? Date.now(),
                distance_km: Math.round(distance * 10) / 10,
              };
            },
          )
          .filter(Boolean) as Strike[];
      }
    } catch {
      // If parsing fails, return empty
    }

    strikes.sort((a, b) => a.distance_km - b.distance_km);
    cache = { data: strikes, ts: now };

    return NextResponse.json({
      strikes,
      count: strikes.length,
      radius_km: RADIUS_KM,
    });
  } catch {
    return NextResponse.json({
      strikes: [],
      count: 0,
      radius_km: RADIUS_KM,
      error: "Failed to fetch lightning data",
    });
  }
}
