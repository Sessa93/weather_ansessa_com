import { ImageResponse } from "next/og";
import pool from "@/lib/db";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OGImage() {
  const latestRes = await pool.query(
    `SELECT outside_temp, humidity, wind_speed, barometer, rain_rate
     FROM weather_readings
     WHERE outside_temp IS NOT NULL
     ORDER BY timestamp DESC LIMIT 1`,
  );

  const statsRes = await pool.query(
    `SELECT MAX(outside_temp) AS high, MIN(outside_temp) AS low
     FROM weather_readings
     WHERE timestamp::date = CURRENT_DATE`,
  );

  const row = latestRes.rows[0] ?? {};
  const stats = statsRes.rows[0] ?? {};
  const temp = row.outside_temp ?? "--";
  const high = stats.high ?? "--";
  const low = stats.low ?? "--";
  const humidity = row.humidity ?? "--";
  const wind = row.wind_speed ?? "--";
  const barometer = row.barometer ?? "--";
  const isRaining = (row.rain_rate ?? 0) > 0;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        padding: "60px",
        fontFamily: "sans-serif",
        color: "#e2e8f0",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#38bdf8",
          }}
        >
          ☁ Jerago con Orago Weather
        </div>
      </div>

      {/* Main temperature */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "20px",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            fontSize: "140px",
            fontWeight: 300,
            lineHeight: 1,
            color: "#f1f5f9",
          }}
        >
          {typeof temp === "number" ? temp.toFixed(1) : temp}°
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            marginBottom: "20px",
            fontSize: "28px",
          }}
        >
          <div style={{ color: isRaining ? "#60a5fa" : "#94a3b8" }}>
            {isRaining ? "🌧 Rain" : "☀ Clear"}
          </div>
          <div style={{ color: "#ef4444" }}>
            ↑ {typeof high === "number" ? high.toFixed(1) : high}°
          </div>
          <div style={{ color: "#3b82f6" }}>
            ↓ {typeof low === "number" ? low.toFixed(1) : low}°
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div
        style={{
          display: "flex",
          gap: "40px",
          fontSize: "24px",
          color: "#94a3b8",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <span>💧</span>
          <span>
            {typeof humidity === "number" ? humidity.toFixed(0) : humidity}%
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span>💨</span>
          <span>{typeof wind === "number" ? wind.toFixed(0) : wind} km/h</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span>🌡</span>
          <span>
            {typeof barometer === "number" ? barometer.toFixed(1) : barometer}{" "}
            mbar
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "auto",
          fontSize: "18px",
          color: "#475569",
        }}
      >
        weather.ansessa.com · Updated every 5 minutes
      </div>
    </div>,
    { ...size },
  );
}
