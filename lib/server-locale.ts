import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  type Locale,
  LOCALE_COOKIE_NAME,
  isLocale,
} from "./i18n";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}
