import React from "react";

interface WeatherIconProps {
  condition?: string;
  code?: number;
  className?: string;
}

export default function WeatherIcon({ condition, code, className = "w-8 h-8" }: WeatherIconProps) {
  // Map Open-Meteo codes to icons
  // https://open-meteo.com/en/docs
  let type = "clear";
  
  if (code !== undefined) {
    if (code === 0) type = "clear";
    else if (code >= 1 && code <= 3) type = "cloudy";
    else if (code >= 45 && code <= 48) type = "fog";
    else if (code >= 51 && code <= 55) type = "drizzle";
    else if (code >= 61 && code <= 65) type = "rain";
    else if (code >= 71 && code <= 77) type = "snow";
    else if (code >= 80 && code <= 82) type = "rain";
    else if (code >= 85 && code <= 86) type = "snow";
    else if (code >= 95 && code <= 99) type = "thunderstorm";
  } else if (condition) {
    const c = condition.toLowerCase();
    if (c.includes("clear")) type = "clear";
    else if (c.includes("cloudy")) type = "cloudy";
    else if (c.includes("rain")) type = "rain";
    else if (c.includes("snow")) type = "snow";
    else if (c.includes("fog")) type = "fog";
    else if (c.includes("thunder")) type = "thunderstorm";
  }

  switch (type) {
    case "clear":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} text-yellow-400`}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
        </svg>
      );
    case "cloudy":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} text-slate-400`}>
          <path d="M17.5 19x" />
          <path d="M17.5 19A3.5 3.5 0 0 0 18 12h-1.25a5 5 0 0 0-9.5-1.5E" />
          <path d="M17.5 19h-11A4.5 4.5 0 0 1 2 14.5V14a4.5 4.5 0 0 1 4.5-4.5H7a5 5 0 0 1 9.5-1.5 3.5 3.5 0 0 1 1 7" />
        </svg>
      );
    case "rain":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} text-blue-400`}>
          <path d="M17.5 19h-11A4.5 4.5 0 0 1 2 14.5V14a4.5 4.5 0 0 1 4.5-4.5H7a5 5 0 0 1 9.5-1.5 3.5 3.5 0 0 1 1 7" />
          <path d="M8 22l1-3" /><path d="M12 22l1-3" /><path d="M16 22l1-3" />
        </svg>
      );
    case "snow":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} text-slate-100`}>
          <path d="M17.5 19h-11A4.5 4.5 0 0 1 2 14.5V14a4.5 4.5 0 0 1 4.5-4.5H7a5 5 0 0 1 9.5-1.5 3.5 3.5 0 0 1 1 7" />
          <path d="M8 15h.01" /><path d="M8 19h.01" /><path d="M12 17h.01" /><path d="M12 21h.01" /><path d="M16 15h.01" /><path d="M16 19h.01" />
        </svg>
      );
    case "fog":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} text-slate-500`}>
          <path d="M7 10a5 5 0 0 1 9.5-1.5 3.5 3.5 0 0 1 1 7H6" />
          <path d="M4 14h16" /><path d="M4 18h16" /><path d="M4 22h16" />
        </svg>
      );
    case "thunderstorm":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} text-purple-400`}>
          <path d="M17.5 19h-11A4.5 4.5 0 0 1 2 14.5V14a4.5 4.5 0 0 1 4.5-4.5H7a5 5 0 0 1 9.5-1.5 3.5 3.5 0 0 1 1 7" />
          <path d="m13 22-3-3h3l-3-3" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} text-slate-400`}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      );
  }
}
