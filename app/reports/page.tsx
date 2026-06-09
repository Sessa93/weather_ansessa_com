"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useLocale } from "../components/LocaleProvider";

interface MonthlyData {
  month: number;
  readings: number;
  avg_temp: number;
  min_temp: number;
  max_temp: number;
  avg_humidity: number;
  total_rain: number;
  max_rain_rate: number;
  avg_wind: number;
  max_wind_gust: number;
  avg_pressure: number;
  rainy_readings: number;
  frost_readings: number;
  hot_readings: number;
  temp_anomaly: number | null;
  rain_anomaly: number | null;
  wind_anomaly: number | null;
}

interface YearlyData {
  readings: number;
  avg_temp: number;
  min_temp: number;
  max_temp: number;
  avg_humidity: number;
  total_rain: number;
  max_rain_rate: number;
  avg_wind: number;
  max_wind_gust: number;
  avg_pressure: number;
}

interface ReportData {
  year: number;
  availableYears: number[];
  yearly: YearlyData | null;
  monthly: MonthlyData[];
}

const MONTH_NAMES_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTH_NAMES_IT = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
];

export default function ReportsPage() {
  const { locale, messages } = useLocale();
  const [data, setData] = useState<ReportData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const monthNames = locale === "it" ? MONTH_NAMES_IT : MONTH_NAMES_EN;
  const m = messages as Record<string, Record<string, string>>;
  const reportMsgs = (m.reports ?? {}) as Record<string, string>;

  const fetchReport = useCallback((y: number) => {
    setLoading(true);
    fetch(`/api/climate-report?year=${y}`)
      .then((r) => r.json())
      .then((d: ReportData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchReport(year);
  }, [year, fetchReport]);

  const chartData = (data?.monthly ?? []).map((m) => ({
    ...m,
    name: monthNames[m.month - 1] ?? m.month,
  }));

  const downloadPdf = async () => {
    if (!reportRef.current || pdfBusy) return;
    setPdfBusy(true);
    setPdfError(null);

    const replacements: {
      parent: Node;
      canvas: HTMLCanvasElement;
      svg: Element;
    }[] = [];

    try {
      const el = reportRef.current;

      // html2canvas cannot render SVG elements reliably —
      // pre-rasterise every Recharts SVG chart to a <canvas>.
      const svgs = Array.from(
        el.querySelectorAll<SVGSVGElement>("svg:not(.animate-spin)"),
      );

      for (const svg of svgs) {
        const rect = svg.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const clone = svg.cloneNode(true) as SVGSVGElement;
        if (!clone.getAttribute("xmlns"))
          clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("width", String(rect.width));
        clone.setAttribute("height", String(rect.height));

        const xml = new XMLSerializer().serializeToString(clone);
        const blob = new Blob([xml], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);

        const c = document.createElement("canvas");
        c.width = rect.width * 2;
        c.height = rect.height * 2;
        c.style.width = `${rect.width}px`;
        c.style.height = `${rect.height}px`;

        const ctx = c.getContext("2d");
        if (!ctx) continue;

        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          img.src = url;
        });

        if (svg.parentNode) {
          const parent = svg.parentNode;
          parent.replaceChild(c, svg);
          replacements.push({ parent, canvas: c, svg });
        }
      }

      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");

      const rendered = await html2canvas(el, {
        backgroundColor: "#0f172a",
        scale: 2,
        useCORS: true,
      });

      const imgData = rendered.toDataURL("image/png");
      const imgW = rendered.width;
      const imgH = rendered.height;

      const pdf = new jsPDF({
        orientation: imgW > imgH ? "landscape" : "portrait",
        unit: "px",
        format: [imgW, imgH],
      });

      pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
      pdf.save(`climate-report-${year}.pdf`);
    } catch (err) {
      console.error("[pdf] Failed to generate PDF:", err);
      setPdfError(
        reportMsgs.pdfError ?? "Failed to generate PDF. Please try again.",
      );
    } finally {
      for (const { parent, canvas, svg } of replacements) {
        try {
          parent.replaceChild(svg, canvas);
        } catch {
          /* DOM moved */
        }
      }
      setPdfBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">
          {reportMsgs.title ?? "Climate Reports"}
        </h1>
        <div className="flex items-center gap-3">
          {data && !loading && data.yearly && (
            <button
              onClick={downloadPdf}
              disabled={pdfBusy}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 text-white text-sm font-medium rounded px-4 py-2 transition-colors"
            >
              {pdfBusy ? (
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3"
                  />
                </svg>
              )}
              {pdfBusy
                ? (reportMsgs.generating ?? "Generating…")
                : (reportMsgs.downloadPdf ?? "Download PDF")}
            </button>
          )}
          {data && data.availableYears.length > 0 && (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600 text-slate-200 rounded px-3 py-2 text-sm"
            >
              {data.availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {pdfError && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded px-4 py-2 text-sm">
          {pdfError}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-64 bg-slate-800 rounded-lg animate-pulse" />
        </div>
      ) : !data || !data.yearly ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
          {reportMsgs.noData ?? "No data available for this year."}
        </div>
      ) : (
        <div ref={reportRef}>
          {/* Yearly overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard
              label={reportMsgs.avgTemp ?? "Avg Temp"}
              value={`${data.yearly.avg_temp}°C`}
            />
            <StatCard
              label={reportMsgs.maxTemp ?? "Max Temp"}
              value={`${data.yearly.max_temp}°C`}
              color="text-red-400"
            />
            <StatCard
              label={reportMsgs.minTemp ?? "Min Temp"}
              value={`${data.yearly.min_temp}°C`}
              color="text-blue-400"
            />
            <StatCard
              label={reportMsgs.totalRain ?? "Total Rain"}
              value={`${data.yearly.total_rain} mm`}
              color="text-sky-400"
            />
            <StatCard
              label={reportMsgs.maxGust ?? "Max Gust"}
              value={`${data.yearly.max_wind_gust} km/h`}
            />
            <StatCard
              label={reportMsgs.avgPressure ?? "Avg Pressure"}
              value={`${data.yearly.avg_pressure} mbar`}
            />
          </div>

          {/* Temperature chart */}
          <ChartCard title={reportMsgs.temperatureTrend ?? "Temperature Trend"}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} unit="°C" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "0.5rem",
                    color: "#e2e8f0",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="max_temp"
                  stroke="#f87171"
                  strokeWidth={2}
                  name={reportMsgs.maxTemp ?? "Max"}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="avg_temp"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  name={reportMsgs.avgTemp ?? "Avg"}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="min_temp"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  name={reportMsgs.minTemp ?? "Min"}
                  dot={{ r: 4 }}
                />
                <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Rainfall chart */}
          <ChartCard title={reportMsgs.monthlyRainfall ?? "Monthly Rainfall"}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} unit="mm" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "0.5rem",
                    color: "#e2e8f0",
                  }}
                />
                <Bar
                  dataKey="total_rain"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                  name={reportMsgs.totalRain ?? "Rain"}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Anomaly chart */}
          {chartData.some((d) => d.temp_anomaly !== null) && (
            <ChartCard
              title={
                reportMsgs.tempAnomaly ?? "Temperature Anomaly vs. Average"
              }
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} unit="°C" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "0.5rem",
                      color: "#e2e8f0",
                    }}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <Bar
                    dataKey="temp_anomaly"
                    name={reportMsgs.anomaly ?? "Anomaly"}
                    radius={[4, 4, 0, 0]}
                    fill="#fbbf24"
                    // Color bars red/blue depending on sign
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Monthly detail table */}
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-100">
                {reportMsgs.monthlyDetail ?? "Monthly Detail"}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase">
                    <th className="px-4 py-3 text-left">
                      {reportMsgs.monthHeader ?? "Month"}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {reportMsgs.avgTemp ?? "Avg °C"}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {reportMsgs.minMax ?? "Min/Max"}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {reportMsgs.rain ?? "Rain mm"}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {reportMsgs.avgWind ?? "Avg Wind"}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {reportMsgs.maxGust ?? "Max Gust"}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {reportMsgs.humidity ?? "Humidity"}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {reportMsgs.anomaly ?? "Anomaly"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.map((m) => (
                    <tr
                      key={m.month}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        {monthNames[m.month - 1]}
                      </td>
                      <td className="px-4 py-3 text-right">{m.avg_temp}°</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-blue-400">{m.min_temp}°</span>
                        {" / "}
                        <span className="text-red-400">{m.max_temp}°</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sky-400">
                        {m.total_rain}
                      </td>
                      <td className="px-4 py-3 text-right">{m.avg_wind}</td>
                      <td className="px-4 py-3 text-right">
                        {m.max_wind_gust}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {m.avg_humidity}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        {m.temp_anomaly !== null ? (
                          <span
                            className={
                              m.temp_anomaly > 0
                                ? "text-red-400"
                                : m.temp_anomaly < 0
                                  ? "text-blue-400"
                                  : "text-slate-400"
                            }
                          >
                            {m.temp_anomaly > 0 ? "+" : ""}
                            {m.temp_anomaly}°
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="text-xs text-slate-400 uppercase font-semibold mb-1">
        {label}
      </div>
      <div className={`text-lg font-bold ${color ?? "text-slate-100"}`}>
        {value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">{title}</h2>
      {children}
    </div>
  );
}
