import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") ?? "json";
  const range = searchParams.get("range") ?? "day";

  let interval: string;
  switch (range) {
    case "week":
      interval = "7 days";
      break;
    case "month":
      interval = "30 days";
      break;
    case "year":
      interval = "365 days";
      break;
    default:
      interval = "1 day";
      break;
  }

  const { rows } = await pool.query(
    `SELECT
      timestamp, outside_temp, feels_like, dew_point, humidity,
      wind_speed, wind_gust, wind_dir, barometer, rain, rain_rate,
      wind_chill, heat_index
    FROM weather_readings
    WHERE timestamp >= NOW() - $1::interval
    ORDER BY timestamp ASC`,
    [interval],
  );

  if (format === "csv") {
    if (rows.length === 0) {
      return new NextResponse("", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="weather-${range}.csv"`,
        },
      });
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(","),
      ...rows.map((row: Record<string, unknown>) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return "";
            if (typeof val === "string" && val.includes(",")) return `"${val}"`;
            return String(val);
          })
          .join(","),
      ),
    ];

    return new NextResponse(csvLines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="weather-${range}.csv"`,
      },
    });
  }

  return NextResponse.json(rows, {
    headers: {
      "Content-Disposition": `attachment; filename="weather-${range}.json"`,
    },
  });
}
