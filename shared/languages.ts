export const SUPPORTED_LANGUAGE_CODES = ["en", "zh"] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

const packs = Object.fromEntries(
  SUPPORTED_LANGUAGE_CODES.map((code) => [code, code]),
) as Record<LanguageCode, LanguageCode>;

/** Every supported language tag and the locale pack it selects. */
export const localePacks: Readonly<Record<string, LanguageCode>> = packs;

const LEGACY_LANGUAGE_CODES = new Set([
  "de", "es", "fr", "hi", "it", "ja", "ko", "pl", "pt", "pt-br", "ru", "tr", "uk", "vi",
]);

export function supportedLanguage(value: unknown): LanguageCode | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toLowerCase().replaceAll("_", "-");
  if (code === "en" || code.startsWith("en-")) return "en";
  if (code === "zh" || code.startsWith("zh-")) return "zh";
  if (LEGACY_LANGUAGE_CODES.has(code) || [...LEGACY_LANGUAGE_CODES].some((legacy) => code.startsWith(`${legacy}-`))) return "en";
  return undefined;
}
