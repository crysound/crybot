import { supportedLanguage } from "../shared/languages.ts";

/** The entry for the language set in Settings, else for its parent, else English. */
export function byLanguage<T>(table: { en: T } & Partial<Record<string, T>>, language: string | undefined): T {
  let candidate = language?.trim().toLowerCase().replaceAll("_", "-") || "en";
  while (candidate) {
    const entry = table[candidate];
    if (entry !== undefined) return entry;
    const separator = candidate.lastIndexOf("-");
    if (separator < 0) break;
    candidate = candidate.slice(0, separator);
  }
  return table.en;
}

/** The locale dates and times are formatted in: the language set in Settings, else US English. */
export function intlLocale(language: string | undefined): string {
  const supported = supportedLanguage(language);
  if (supported === "zh") return "zh-CN";
  if (supported === "en" && /^en(?:-|$)/i.test(language?.trim() || "en")) {
    try {
      return Intl.getCanonicalLocales(language?.trim() || "en-US")[0] ?? "en-US";
    } catch {
      return "en-US";
    }
  }
  return "en-US";
}

export function requestedLanguageTag(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value.trim())) return undefined;
  try {
    const tag = Intl.getCanonicalLocales(value.trim())[0];
    const name = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" }).of(tag);
    return name ? tag : undefined;
  } catch {
    return undefined;
  }
}
