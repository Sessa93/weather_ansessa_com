"use client";

import { useLocale } from "./LocaleProvider";

export default function Footer() {
  const { messages } = useLocale();

  return (
    <footer className="bg-slate-950 text-slate-500 text-center py-4 text-sm mt-auto border-t border-slate-800">
      <p>
        Copyright &copy; {new Date().getFullYear()}{" "}
        <a href="https://ansessa.com" className="text-sky-400 hover:underline">
          ansessa.com
        </a>
      </p>
      <p className="mt-1 text-xs text-slate-600">
        {messages.footer.disclaimer}
      </p>
    </footer>
  );
}
