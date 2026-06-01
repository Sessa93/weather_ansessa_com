"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getIntlLocale,
  getMessages,
  type Locale,
  type Messages,
} from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  intlLocale: string;
  messages: Messages;
  isPending: boolean;
  setLocale: (locale: Locale) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const locale =
    pendingLocale === initialLocale
      ? initialLocale
      : (pendingLocale ?? initialLocale);

  const setLocale = async (nextLocale: Locale) => {
    if (nextLocale === locale) return;

    setPendingLocale(nextLocale);

    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locale: nextLocale }),
      });

      if (!response.ok) {
        throw new Error("Failed to update locale cookie");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setPendingLocale(null);
    }
  };

  const value: LocaleContextValue = {
    locale,
    intlLocale: getIntlLocale(locale),
    messages: getMessages(locale),
    isPending,
    setLocale,
  };

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
