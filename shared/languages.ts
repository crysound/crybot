const packs = {
  en: "en",
  de: "de",
  es: "es",
  fr: "fr",
  hi: "hi",
  ja: "ja",
  pt: "pt-br",
  "pt-br": "pt-br",
  zh: "zh",
  "zh-hant": "zh-tw",
  "zh-hk": "zh-tw",
  "zh-mo": "zh-tw",
  "zh-tw": "zh-tw",
  uk: "uk",
  vi: "vi",
  tr: "tr",
  pl: "pl",
  ru: "ru",
  it: "it",
  ko: "ko",
} as const;

export type LanguageCode = typeof packs[keyof typeof packs];

/** Every supported language tag and the locale pack it selects. */
export const localePacks: Readonly<Record<string, LanguageCode>> = packs;

export function supportedLanguage(value: unknown): LanguageCode | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toLowerCase();
  if (["zh-cn", "zh-hans", "zh-sg"].includes(code)) return "zh";
  return Object.hasOwn(localePacks, code) ? localePacks[code] : undefined;
}
