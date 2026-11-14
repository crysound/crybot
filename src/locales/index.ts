import type English from "./en.json";
import { localeKeyCount } from "virtual:english-contracts";

export type LocaleKey = keyof typeof English;
export const en: Partial<Record<LocaleKey, string>> = {};
export type LocalePack = Partial<Record<LocaleKey, string>>;

const packLoaders = {
  en: () => import("./en.json?locale"),
  de: () => import("./de.json?locale"),
  es: () => import("./es.json?locale"),
  fr: () => import("./fr.json?locale"),
  hi: () => import("./hi.json?locale"),
  ja: () => import("./ja.json?locale"),
  "pt-br": () => import("./pt-br.json?locale"),
  zh: () => import("./zh.json?locale"),
  "zh-tw": () => import("./zh-tw.json?locale"),
  uk: () => import("./uk.json?locale"),
  vi: () => import("./vi.json?locale"),
  tr: () => import("./tr.json?locale"),
  pl: () => import("./pl.json?locale"),
  ru: () => import("./ru.json?locale"),
  it: () => import("./it.json?locale"),
  ko: () => import("./ko.json?locale"),
} satisfies Record<string, () => Promise<{ default: LocalePack; missingKeys: string[] }>>;

export type PackName = "en" | keyof typeof packLoaders;

/** Every language tag the app answers to, and the pack it shows. */
export const localePacks: Readonly<Record<string, PackName>> = {
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
};

export const locales: Record<string, LocalePack> = { en };
const missingTranslations = new WeakMap<LocalePack, ReadonlySet<string>>();
const pending = new Map<PackName, Promise<LocalePack>>();

export function hasTranslation(tag: string, key: LocaleKey): boolean {
  const pack = locales[tag];
  return !!pack && Object.hasOwn(pack, key) && !missingTranslations.get(pack)?.has(key);
}

export function packComplete(pack: LocalePack): boolean {
  return Object.keys(pack).length === localeKeyCount && !missingTranslations.get(pack)?.size;
}

export async function loadLocalePack(tag: string): Promise<LocalePack | undefined> {
  const name = localePacks[tag];
  if (!name) return locales[tag];
  if (locales[tag] && (name !== "en" || Object.keys(en).length)) return locales[tag];
  let loading = pending.get(name);
  if (!loading) {
    loading = packLoaders[name]().then(({ default: loaded, missingKeys }) => {
      const pack = name === "en" ? Object.assign(en, loaded) : loaded;
      missingTranslations.set(pack, new Set(missingKeys));
      for (const [alias, shown] of Object.entries(localePacks)) if (shown === name) locales[alias] = pack;
      return pack;
    }).finally(() => pending.delete(name));
    pending.set(name, loading);
  }
  return loading;
}

export const localeChoices: ReadonlyArray<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "hi", label: "हिन्दी" },
  { code: "ja", label: "日本語" },
  { code: "pt-br", label: "Português (Brasil)" },
  { code: "zh", label: "简体中文" },
  { code: "zh-tw", label: "繁體中文（台灣）" },
  { code: "uk", label: "Українська" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "tr", label: "Türkçe" },
  { code: "pl", label: "Polski" },
  { code: "ru", label: "Русский" },
  { code: "it", label: "Italiano" },
  { code: "ko", label: "한국어" },
];
