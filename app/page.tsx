import CurrentConditions from "./components/CurrentConditions";
import RecordSnapshots from "./components/RecordSnapshots";
import HomeCharts from "./components/HomeCharts";
import WindyRadar from "./components/WindyRadar";
import MonthlyRainChart from "./components/MonthlyRainChart";
import ClimatologyChart from "./components/ClimatologyChart";
import DaySummary from "./components/DaySummary";
import Forecast from "./components/Forecast";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/server-locale";

export default async function Home() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CurrentConditions />
        <WindyRadar />
      </div>

      <Forecast />

      <DaySummary />

      <RecordSnapshots />

      <div>
        <h2 className="text-lg font-semibold text-slate-300 mb-3">
          {messages.home.todayCharts}
        </h2>
        <HomeCharts />
      </div>

      <MonthlyRainChart />

      <ClimatologyChart />
    </div>
  );
}
