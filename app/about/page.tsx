export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">About This Station</h1>

      <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6 space-y-4 text-sm text-slate-300 leading-relaxed">
        <p>
          This weather station is located in <strong>Jerago con Orago</strong>,
          a small town in the province of Varese, Lombardy, Italy.
        </p>

        <p>
          The station provides realtime weather data including temperature,
          humidity, wind speed and direction, barometric pressure, and rainfall.
          Data is recorded every 5 minutes and stored in a PostgreSQL database.
        </p>

        <h2 className="text-lg font-semibold text-slate-100 pt-2">
          Data Sources
        </h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Temperature, humidity, dew point</li>
          <li>Wind speed, gust, and direction</li>
          <li>Barometric pressure</li>
          <li>Rainfall and rain rate</li>
          <li>Heat index and wind chill (computed)</li>
        </ul>

        <h2 className="text-lg font-semibold text-slate-100 pt-2">
          Technology
        </h2>
        <p>
          Built with Next.js, PostgreSQL, and Recharts. Inspired by the weewx
          Belchertown skin.
        </p>

        <div className="border-t border-slate-700 pt-4 text-xs text-slate-500">
          Never make important decisions from this website.
        </div>
      </div>
    </div>
  );
}
