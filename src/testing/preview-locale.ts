import { loadLocale } from "../lib/i18n";

export function preparePreviewLocale(tag = new URLSearchParams(location.search).get("lang") ?? "en"): Promise<string> {
  return loadLocale(tag);
}
