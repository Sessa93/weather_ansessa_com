import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/server-locale";

export default async function AboutPage() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">
        {messages.about.title}
      </h1>

      <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6 space-y-4 text-sm text-slate-300 leading-relaxed">
        <p>{messages.about.intro1}</p>

        <p>{messages.about.intro2}</p>

        <h2 className="text-lg font-semibold text-slate-100 pt-2">
          {messages.about.dataSources}
        </h2>
        <ul className="list-disc list-inside space-y-1">
          <li>{messages.about.sourceTemperature}</li>
          <li>{messages.about.sourceWind}</li>
          <li>{messages.about.sourceBarometer}</li>
          <li>{messages.about.sourceRain}</li>
          <li>{messages.about.sourceDerived}</li>
        </ul>

        <h2 className="text-lg font-semibold text-slate-100 pt-2">
          {messages.about.technology}
        </h2>
        <p>{messages.about.technologyText}</p>

        <div className="border-t border-slate-700 pt-4 text-xs text-slate-500">
          {messages.footer.disclaimer}
        </div>
      </div>
    </div>
  );
}
