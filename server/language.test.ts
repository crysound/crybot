import { expect, it } from "vitest";

import { byLanguage, intlLocale, requestedLanguageTag } from "./language.ts";

it("picks the pack the app would: exact, alias, parent, else English", () => {
  const table = { en: "en", zh: "zh" };
  expect([" PT-BR ", "pt", "pt-PT", "zh-HK", "zh-Hant-TW", "fr-CA", "xx", undefined, ""].map((language) => byLanguage(table, language)))
    .toEqual(["en", "en", "en", "zh", "zh", "en", "en", "en", "en"]);
});

it("formats in the language set, and in US English when none or a bad one is set", () => {
  expect([intlLocale("zh"), intlLocale(undefined), intlLocale("not a locale!"), intlLocale("de-DE"), intlLocale("ar"), intlLocale("en-GB")])
    .toEqual(["zh-CN", "en-US", "en-US", "en-US", "en-US", "en-GB"]);
});


it("returns a present-but-falsy value instead of falling back to English", () => {
  expect(byLanguage({ en: true, fr: false }, "fr")).toBe(false);
  expect(byLanguage({ en: "E", fr: "" }, "fr")).toBe("");
  expect(byLanguage({ en: 1, fr: 0 }, "FR")).toBe(0);
});

it("preserves supported model language tags independently of the UI packs", () => {
  expect(["de", "ar", "en-US", "zh-Hant"].map(requestedLanguageTag)).toEqual(["de", "ar", "en-US", "zh-Hant"]);
  expect(["xx", "constructor", "en<script>", "", null, 12].map(requestedLanguageTag)).toEqual(Array(6).fill(undefined));
});
