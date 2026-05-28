"use client";

import { useEffect, useState } from "react";

export default function DaySummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/day-summary")
      .then((r) => r.json())
      .then((d) => {
        if (d.summary) setSummary(d.summary);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (error) return null;

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-4 h-4 text-sky-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-slate-300">
          Today&apos;s Summary
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Generating summary…</span>
        </div>
      ) : (
        <p className="text-slate-300 text-sm leading-relaxed">{summary}</p>
      )}
    </div>
  );
}
