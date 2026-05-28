export default function WindyRadar() {
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden h-full">
      <iframe
        title="Windy Weather Radar"
        width="100%"
        height="100%"
        style={{ minHeight: 350 }}
        src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=8&overlay=radar&product=radar&level=surface&lat=45.72&lon=8.79&message=true"
        frameBorder="0"
        className="block w-full"
      />
    </div>
  );
}
