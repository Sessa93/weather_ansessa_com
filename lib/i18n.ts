export const LOCALE_COOKIE_NAME = "locale";
export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "it"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "it";
}

export function getIntlLocale(locale: Locale): string {
  return locale === "it" ? "it-IT" : "en-US";
}

const messages = {
  en: {
    metadata: {
      title: "Jerago con Orago Weather",
      description: "Realtime and historical weather data for Jerago con Orago",
    },
    nav: {
      stationName: "Jerago con Orago Weather Station",
      home: "Home",
      graphs: "Graphs",
      records: "Records",
      about: "About",
      language: "Language",
      english: "English",
      italian: "Italian",
    },
    footer: {
      disclaimer: "Never make important decisions from this website.",
    },
    common: {
      today: "Today",
      week: "Week",
      month: "Month",
      year: "Year",
      allTime: "All Time",
      recorded: "Recorded",
      unavailable: "n/a",
      loading: "Loading…",
    },
    home: {
      todayCharts: "Today's Charts",
    },
    about: {
      title: "About This Station",
      intro1:
        "This weather station is located in Jerago con Orago, a small town in the province of Varese, Lombardy, Italy.",
      intro2:
        "The station provides realtime weather data including temperature, humidity, wind speed and direction, barometric pressure, and rainfall. Data is recorded every 5 minutes and stored in a PostgreSQL database.",
      dataSources: "Data Sources",
      sourceTemperature: "Temperature, humidity, dew point",
      sourceWind: "Wind speed, gust, and direction",
      sourceBarometer: "Barometric pressure",
      sourceRain: "Rainfall and rain rate",
      sourceDerived: "Heat index and wind chill (computed)",
      technology: "Technology",
      technologyText:
        "Built with Next.js, PostgreSQL, and Recharts. Inspired by the weewx Belchertown skin.",
    },
    current: {
      live: "Live",
      lastKnown: "Last known",
      feelsLike: "Feels like",
      high: "High",
      low: "Low",
      wind: "Wind",
      gust: "Gust",
      barometer: "Barometer",
      dewPoint: "Dew Point",
      humidity: "Humidity",
      rainToday: "Rain Today",
      rate: "Rate",
      sunrise: "Sunrise",
      sunset: "Sunset",
      moon: "Moon",
      visible: "visible",
      connectionError: "Unable to connect to weather station",
    },
    forecast: {
      title: "7-Day Forecast",
      unavailable: "Forecast unavailable",
      help: "Check your station location settings and internet connection.",
    },
    daySummary: {
      title: "Today's Summary",
      generating: "Generating summary…",
      noData: "No data available for today yet.",
      unable: "Unable to generate summary.",
      forecastPrefix: "Forecast:",
    },
    graphs: {
      title: "Weather Observation Graphs",
      exportCSV: "Export CSV",
      exportJSON: "Export JSON",
      compareLastYear: "Compare Last Year",
    },
    charts: {
      temperature: "Temperature",
      dewPoint: "Dew Point",
      windChill: "Wind Chill",
      heatIndex: "Heat Index",
      windSpeed: "Wind Speed",
      gust: "Gust",
      rain: "Rain",
      rainRate: "Rain Rate",
      total: "Total",
      barometer: "Barometer",
      humidity: "Humidity",
      monthlyRainfall: "Monthly Rainfall",
      rainLabel: "Rain",
      climatology: "Average Climatological Values",
      heatmap: "Year at a Glance",
      lastYear: "Last Year",
      dailyMax: "Daily Max",
      dailyAvg: "Daily Avg",
      dailyMin: "Daily Min",
    },
    snapshots: {
      title: "Weather Record Snapshots",
      monthlyTotals: "Monthly totals",
      annualSummary: "Annual summary",
      temperature: "Temperature",
      high: "High",
      low: "Low",
      windSpeed: "Wind Speed",
      average: "Average",
      maxGust: "Max Gust",
      precipitation: "Precipitation",
      totalRain: "Total Rain",
      maxRate: "Max Rate",
    },
    records: {
      title: "Weather Observation Records",
      temperatureRecords: "Temperature Records",
      windRecords: "Wind Records",
      rainRecords: "Rain Records",
      humidityRecords: "Humidity Records",
      barometerRecords: "Barometer Records",
      highestTemperature: "Highest Temperature",
      lowestTemperature: "Lowest Temperature",
      strongestWindGust: "Strongest Wind Gust",
      highestDailyRainRate: "Highest Daily Rain Rate",
      totalRainfall: "Total Rainfall",
      highestHumidity: "Highest Humidity",
      lowestHumidity: "Lowest Humidity",
      highestBarometer: "Highest Barometer",
      lowestBarometer: "Lowest Barometer",
    },
    windRose: {
      title: "Wind Rose",
      avg: "Avg",
      gust: "Gust",
      dominant: "Dom",
      calm: "calm",
    },
    windy: {
      title: "Windy Weather Radar",
    },
    lightning: {
      title: "Lightning Activity",
      strikes: "strikes detected",
      nearest: "Nearest",
      within: "within",
    },
  },
  it: {
    metadata: {
      title: "Meteo Jerago con Orago",
      description: "Dati meteo in tempo reale e storici per Jerago con Orago",
    },
    nav: {
      stationName: "Stazione Meteo di Jerago con Orago",
      home: "Home",
      graphs: "Grafici",
      records: "Record",
      about: "Info",
      language: "Lingua",
      english: "Inglese",
      italian: "Italiano",
    },
    footer: {
      disclaimer: "Non prendere decisioni importanti basandoti su questo sito.",
    },
    common: {
      today: "Oggi",
      week: "Settimana",
      month: "Mese",
      year: "Anno",
      allTime: "Assoluto",
      recorded: "Registrato",
      unavailable: "n/d",
      loading: "Caricamento…",
    },
    home: {
      todayCharts: "Grafici di oggi",
    },
    about: {
      title: "Informazioni sulla stazione",
      intro1:
        "Questa stazione meteo si trova a Jerago con Orago, un piccolo comune della provincia di Varese, in Lombardia.",
      intro2:
        "La stazione fornisce dati meteo in tempo reale, inclusi temperatura, umidita, velocita e direzione del vento, pressione barometrica e precipitazioni. I dati vengono registrati ogni 5 minuti e salvati in un database PostgreSQL.",
      dataSources: "Fonti dei dati",
      sourceTemperature: "Temperatura, umidita, punto di rugiada",
      sourceWind: "Velocita del vento, raffiche e direzione",
      sourceBarometer: "Pressione barometrica",
      sourceRain: "Pioggia e intensita di precipitazione",
      sourceDerived: "Indice di calore e wind chill (calcolati)",
      technology: "Tecnologia",
      technologyText:
        "Realizzato con Next.js, PostgreSQL e Recharts. Ispirato al tema Belchertown di weewx.",
    },
    current: {
      live: "Live",
      lastKnown: "Ultimo dato",
      feelsLike: "Percepita",
      high: "Max",
      low: "Min",
      wind: "Vento",
      gust: "Raffica",
      barometer: "Barometro",
      dewPoint: "Punto di rugiada",
      humidity: "Umidita",
      rainToday: "Pioggia oggi",
      rate: "Intensita",
      sunrise: "Alba",
      sunset: "Tramonto",
      moon: "Luna",
      visible: "visibile",
      connectionError: "Impossibile collegarsi alla stazione meteo",
    },
    forecast: {
      title: "Previsioni a 7 giorni",
      unavailable: "Previsioni non disponibili",
      help: "Controlla le impostazioni della posizione della stazione e la connessione Internet.",
    },
    daySummary: {
      title: "Riepilogo di oggi",
      generating: "Generazione del riepilogo…",
      noData: "Nessun dato disponibile per oggi.",
      unable: "Impossibile generare il riepilogo.",
      forecastPrefix: "Previsione:",
    },
    graphs: {
      title: "Grafici delle osservazioni meteo",
      exportCSV: "Esporta CSV",
      exportJSON: "Esporta JSON",
      compareLastYear: "Confronta anno scorso",
    },
    charts: {
      temperature: "Temperatura",
      dewPoint: "Punto di rugiada",
      windChill: "Wind chill",
      heatIndex: "Indice di calore",
      windSpeed: "Velocita del vento",
      gust: "Raffica",
      rain: "Pioggia",
      rainRate: "Intensita",
      total: "Totale",
      barometer: "Barometro",
      humidity: "Umidita",
      monthlyRainfall: "Pioggia mensile",
      rainLabel: "Pioggia",
      climatology: "Valori climatologici medi",
      heatmap: "Panoramica annuale",
      lastYear: "Anno scorso",
      dailyMax: "Massima giornaliera",
      dailyAvg: "Media giornaliera",
      dailyMin: "Minima giornaliera",
    },
    snapshots: {
      title: "Condizioni meteo",
      monthlyTotals: "Totali mensili",
      annualSummary: "Riepilogo annuale",
      temperature: "Temperatura",
      high: "Max",
      low: "Min",
      windSpeed: "Velocita del vento",
      average: "Media",
      maxGust: "Raffica max",
      precipitation: "Precipitazioni",
      totalRain: "Pioggia totale",
      maxRate: "Intensita max",
    },
    records: {
      title: "Record delle osservazioni meteo",
      temperatureRecords: "Record di temperatura",
      windRecords: "Record del vento",
      rainRecords: "Record di pioggia",
      humidityRecords: "Record di umidita",
      barometerRecords: "Record del barometro",
      highestTemperature: "Temperatura piu alta",
      lowestTemperature: "Temperatura piu bassa",
      strongestWindGust: "Raffica piu forte",
      highestDailyRainRate: "Massima intensita di pioggia giornaliera",
      totalRainfall: "Pioggia totale",
      highestHumidity: "Umidita piu alta",
      lowestHumidity: "Umidita piu bassa",
      highestBarometer: "Barometro piu alto",
      lowestBarometer: "Barometro piu basso",
    },
    windRose: {
      title: "Vento",
      avg: "Med",
      gust: "Raff",
      dominant: "Prev",
      calm: "Calma",
    },
    windy: {
      title: "Radar meteo",
    },
    lightning: {
      title: "Attivita elettrica",
      strikes: "fulmini rilevati",
      nearest: "Piu vicino",
      within: "entro",
    },
  },
} as const;

export type Messages = typeof messages.en;

export function getMessages(locale: Locale): Messages {
  return messages[locale] as Messages;
}

const weatherConditions = {
  en: {
    0: "Clear sky",
    1: "Mainly clear, partly cloudy, and overcast",
    45: "Fog",
    51: "Drizzle",
    61: "Rain",
    71: "Snow fall",
    77: "Snow grains",
    80: "Rain showers",
    85: "Snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    unknown: "Unknown",
  },
  it: {
    0: "Cielo sereno",
    1: "Poco nuvoloso, parzialmente nuvoloso o coperto",
    45: "Nebbia",
    51: "Pioviggine",
    61: "Pioggia",
    71: "Nevicata",
    77: "Granuli di neve",
    80: "Rovesci di pioggia",
    85: "Rovesci di neve",
    95: "Temporale",
    96: "Temporale con grandine",
    unknown: "Sconosciuto",
  },
} as const;

export function getLocalizedWeatherCondition(
  code: number,
  locale: Locale,
): string {
  if (code === 0) return weatherConditions[locale][0];
  if (code === 1 || code === 2 || code === 3)
    return weatherConditions[locale][1];
  if (code === 45 || code === 48) return weatherConditions[locale][45];
  if (code === 51 || code === 53 || code === 55)
    return weatherConditions[locale][51];
  if (code === 61 || code === 63 || code === 65)
    return weatherConditions[locale][61];
  if (code === 71 || code === 73 || code === 75)
    return weatherConditions[locale][71];
  if (code === 77) return weatherConditions[locale][77];
  if (code === 80 || code === 81 || code === 82)
    return weatherConditions[locale][80];
  if (code === 85 || code === 86) return weatherConditions[locale][85];
  if (code === 95) return weatherConditions[locale][95];
  if (code === 96 || code === 99) return weatherConditions[locale][96];
  return weatherConditions[locale].unknown;
}

const currentConditionTranslations: Record<string, Record<Locale, string>> = {
  Rain: { en: "Rain", it: "Pioggia" },
  "Mostly Cloudy": { en: "Mostly Cloudy", it: "Molto nuvoloso" },
  "Partly Cloudy": { en: "Partly Cloudy", it: "Parzialmente nuvoloso" },
  "Mostly Clear": { en: "Mostly Clear", it: "Prevalentemente sereno" },
};

export function translateCurrentCondition(
  condition: string,
  locale: Locale,
): string {
  return currentConditionTranslations[condition]?.[locale] ?? condition;
}
