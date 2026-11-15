import { localePacks, SUPPORTED_LANGUAGE_CODES, supportedLanguage, type LanguageCode as PackName } from "../../shared/languages";
import type English from "./en.json";
import { localeKeyCount } from "virtual:english-contracts";

export { localePacks };
export type { PackName };

export type LocaleKey = keyof typeof English;
export const en: Partial<Record<LocaleKey, string>> = {};
export type LocalePack = Partial<Record<LocaleKey, string>>;

const packLoaders = {
  en: () => import("./en.json?locale"),
  zh: () => import("./zh.json?locale"),
} satisfies Record<PackName, () => Promise<{ default: LocalePack; missingKeys: string[] }>>;

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
  const name = supportedLanguage(tag) ?? localePacks[tag];
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

export const localeChoices: ReadonlyArray<{ code: string; label: string }> = SUPPORTED_LANGUAGE_CODES.map((code) => ({
  code,
  label: code === "zh" ? "简体中文" : "English",
}));
