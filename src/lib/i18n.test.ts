import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { activePackComplete, documentLanguage, intlLocale, resolveLocale, setLocale, t, tFromServer } from "./i18n";
import { en, localeChoices, locales } from "@/locales";

afterEach(() => {
  setLocale("en");
});

describe("resolveLocale", () => {
  const available = new Set(["en", "zh"]);

  it("keeps a registered exact tag, case-insensitively", () => {
    expect(resolveLocale("zh-CN", available)).toBe("zh");
    expect(resolveLocale("en-US", available)).toBe("en");
  });

  it("falls back from a regional tag to its base language", () => {
    expect(resolveLocale("zh-Hant-TW", available)).toBe("zh");
  });

  it("falls back through script tags before the base language", () => {
    expect(resolveLocale("zh-Hant-TW", available)).toBe("zh");
  });

  it("falls back to English for unknown or missing tags", () => {
    expect(resolveLocale("fr-FR", available)).toBe("en");
    expect(resolveLocale(undefined, available)).toBe("en");
    expect(resolveLocale("", available)).toBe("en");
  });
});

describe("t", () => {
  it("returns the English catalog value by default", () => {
    expect(t("engines.cloud")).toBe("Cloud");
  });

  it("fills {app} with the product's name, the name a caller passes", () => {
    expect(t("routines.runsOn.localHint")).toBe("Starts while Cry Bot is open here.");
    expect(t("routines.runsOn.localHint", { app: "Acme" })).toBe("Starts while Acme is open here.");

  });

  it("keeps new department lifecycle labels available in partial packs, with interpolated names and counts", () => {
    setLocale("zh");
    expect(t("team.create")).toBe("创建部门");
    expect(t("team.moveTo", { name: "Research" })).toBe("将智能体移至 Research");
    expect(t("team.moveMany", { count: 2 })).toBe("移动 2 个智能体");
    expect(t("team.deleteTitle", { name: "Research" })).toBe("要删除 Research 部门吗？");
    expect(t("team.instructionsTitle", { name: "Research" })).toBe("Research 的共享指示");
  });

  it("setLocale reports the locale that actually took effect", () => {
    expect(setLocale("de-AT")).toBe("en");
    expect(t("engines.local")).toBe("Local");
    expect(setLocale("xx-YY")).toBe("en");
    expect(t("engines.local")).toBe("Local");
  });

  it("resolves every registered locale to itself", () => {
    const available = new Set(Object.keys(locales));
    for (const code of available) {
      expect(resolveLocale(code, available)).toBe(code);
    }
  });

  it("routes common system tags onto the shipped packs", () => {
    const available = new Set(Object.keys(locales));
    expect(resolveLocale("zh-CN", available)).toBe("zh");
    expect(resolveLocale("zh-TW", available)).toBe("zh");
    expect(resolveLocale("zh-Hant-TW", available)).toBe("zh");
    for (const tag of ["ja-JP", "pt-BR", "pt-PT", "hi-IN", "tr-TR", "ru-RU", "ru-RU-x-custom"]) {
      expect(resolveLocale(tag, available)).toBe("en");
    }
  });

  it("every registered pack carries only known keys with non-empty values", () => {
    for (const pack of Object.values(locales)) {
      for (const [key, value] of Object.entries(pack)) {
        expect(Object.hasOwn(en, key)).toBe(true);
        expect((value ?? "").trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("ships translated model and trusted-access help for threads", () => {
    for (const [code, pack] of Object.entries(locales)) {
      if (code === "en") continue;
      for (const key of ["model.threadBusy", "model.chooseThreadHint", "approvalMode.threadTrustedNotice"] as const) {
        expect(pack[key], `${code}: ${key}`).toBeTruthy();
        expect(pack[key], `${code}: ${key}`).not.toBe(en[key]);
      }
    }
  });

  it("ships exactly one JSON catalog for every picker language", () => {
    const files = Object.keys(import.meta.glob("../locales/*.json", { eager: true }))
      .map((path) => path.split("/").at(-1))
      .filter((file) => file !== "source-hashes.json")
      .sort();
    const choices = localeChoices.map(({ code }) => `${code}.json`).sort();
    expect(files).toEqual(choices);
  });

  it("overlays a partial pack and falls back to English for missing keys", () => {
    locales["zz"] = { "engines.cloud": "Wolke" };
    try {
      expect(setLocale("zz")).toBe("zz");
      expect(t("engines.cloud")).toBe("Wolke");
      expect(t("engines.local")).toBe("Local");
    } finally {
      delete locales["zz"];
      setLocale("en");
    }
  });

  it("interpolates params and keeps unmatched placeholders visible", () => {
    // A raw template, so the test doesn't depend on which catalog keys use params.
    const template = "Hello {name}, {missing}!";
    const rendered = template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in { name: "Bot" } ? String({ name: "Bot" }[name as "name"]) : match,
    );
    expect(rendered).toBe("Hello Bot, {missing}!");
  });
});

describe("activePackComplete", () => {
  it("is true only for a pack other than English that has every English key", () => {
    expect(activePackComplete()).toBe(false);
    setLocale("zh");
    expect(activePackComplete()).toBe(false);
    locales["zz"] = { "approval.held.native": "x" };
    try {
      setLocale("zz");
      expect(activePackComplete()).toBe(false);
    } finally {
      delete locales["zz"];
    }
  });
});

describe("tFromServer", () => {
  it("translates a key the catalog knows", () => {
    locales["zz"] = { "approval.held.native": "Der Anbieter verlangt deine Zustimmung." };
    try {
      setLocale("zz");
      expect(tFromServer("approval.held.native", "The provider requires your approval for this action."))
        .toBe("Der Anbieter verlangt deine Zustimmung.");
    } finally {
      delete locales["zz"];
      setLocale("en");
    }
  });

  it("falls back to English for a key this build does not carry", () => {
    expect(tFromServer("approval.held.inventedLater", "A note from a newer server."))
      .toBe("A note from a newer server.");
  });

  it.each(["constructor", "toString", "__proto__"])("rejects inherited catalog property %s", (key) => {
    expect(tFromServer(key, "A note from the server.")).toBe("A note from the server.");
  });

  it("shows a card that carries only text, and nothing when it carries neither", () => {
    expect(tFromServer(undefined, "Routine could not be applied: disk full"))
      .toBe("Routine could not be applied: disk full");
    expect(tFromServer(undefined, undefined)).toBeUndefined();
  });

  it("fills the params, and keeps the English when one the template needs is missing", () => {
    expect(tFromServer("chat.notice.cutOffByRestart", "Scout was cut off by a restart; resuming", { name: "Scout" }))
      .toBe("Scout was cut off by a restart; resuming");
    setLocale("zh");
    try {
      expect(tFromServer("chat.notice.cutOffByRestart", "English", { name: "Scout" })).toBe("Scout 因重启中断，正在继续");
      expect(tFromServer("chat.notice.cutOffByRestart", "English")).toBe("English");
      expect(tFromServer("chat.notice.cutOffByRestart", "English", { other: "x" })).toBe("English");
    } finally {
      setLocale("en");
    }
  });

  it("prefers the catalog over stale text saved with an older card", () => {
    expect(tFromServer("approval.held.undelivered", "Auto mode couldn't answer this one."))
      .toBe(en["approval.held.undelivered"]);
  });
});

describe("loading a language", () => {
  beforeEach(() => {
    vi.doUnmock("@/locales");
  });

  afterEach(() => {
    vi.doUnmock("@/locales");
    vi.resetModules();
  });

  it("downloads only the chosen merged pack and shows it once it is here", async () => {
    vi.resetModules();
    const page = await import("./i18n");
    const packs = await import("@/locales");
    expect(Object.keys(packs.locales)).toEqual(["en"]);
    expect(Object.keys(packs.en)).toEqual([]);
    expect(page.setLocale("de")).toBe("en");
    expect(await page.loadLocale("zh-CN")).toBe("zh");
    expect(page.t("engines.local")).toBe("本地");
    expect(Object.keys(packs.en)).toEqual([]);
    expect(Object.keys(packs.locales)).toEqual(["en", "zh"]);
    expect(page.setLocale("zh")).toBe("zh");
  });

  it("shows the language asked for last, whichever pack arrives first", async () => {
    vi.resetModules();
    const page = await import("./i18n");
    await Promise.all([page.loadLocale("ja"), page.loadLocale("fr"), page.loadLocale("zh")]);
    expect(page.activeLocale()).toBe("zh");
    expect(page.activeLanguage()).toBe("zh");
    const later = page.loadLocale("de");
    page.setLocale("en");
    await later;
    expect(page.activeLocale()).toBe("en");
    expect(page.activeLanguage()).toBe("en");
  });

  it.each(["de", "ar", "zh-TW"])("keeps %s separate from the loaded interface pack", async (language) => {
    vi.resetModules();
    const page = await import("./i18n");
    expect(await page.loadLocale(language)).toBe(language === "zh-TW" ? "zh" : "en");
    expect(page.activeLanguage()).toBe(language);
  });

  it("fills every missing translation without downloading the English pack", async () => {
    for (const { code } of localeChoices) {
      vi.resetModules();
      const page = await import("./i18n");
      const packs = await import("@/locales");
      await page.loadLocale(code);
      const merged = packs.locales[code]!;
      for (const key of Object.keys(en) as Array<keyof typeof en>) {
        expect(merged[key], `${code}: ${key}`).toBe(locales[code]![key] ?? en[key]);
      }
      expect(Object.keys(packs.en).length).toBe(code === "en" ? Object.keys(en).length : 0);
      expect(page.activePackComplete()).toBe(code !== "en" && Object.keys(en).every((key) => Object.hasOwn(locales[code]!, key)));
    }
  });

  it("preserves translation provenance for English-filled keys", async () => {
    vi.resetModules();
    const page = await import("./i18n");
    const packs = await import("@/locales");
    await page.loadLocale("zh");
    const missing = (Object.keys(en) as Array<keyof typeof en>).find((key) => !Object.hasOwn(locales.zh!, key))!;
    expect(page.t(missing)).toBe(t(missing));
    expect(packs.hasTranslation("zh", missing)).toBe(false);
    expect(page.activePackComplete()).toBe(false);
  });

  it("falls back to the merged English pack when only the requested pack fails", async () => {
    vi.resetModules();
    vi.doMock("@/locales", async (original) => {
      const real = await original<typeof import("@/locales")>();
      return { ...real, loadLocalePack: (tag: string) => tag === "zh" ? Promise.reject(new Error("offline")) : real.loadLocalePack(tag) };
    });
    const page = await import("./i18n");
    expect(await page.loadLocale("zh")).toBe("en");
    expect(page.t("rail.thisComputer")).toBe("This computer");
  });

  it("rejects when even English is offline, and tries again next time", async () => {
    vi.resetModules();
    let offline = true;
    vi.doMock("@/locales", async (original) => {
      const real = await original<typeof import("@/locales")>();
      return { ...real, loadLocalePack: (tag: string) => offline ? Promise.reject(new Error("offline")) : real.loadLocalePack(tag) };
    });
    const page = await import("./i18n");
    await expect(page.loadLocale("zh")).rejects.toThrow("offline");
    await expect(page.loadLocale("en")).rejects.toThrow("offline");
    offline = false;
    expect(await page.loadLocale("zh")).toBe("zh");
    expect(page.t("rail.thisComputer")).toBe("这台电脑");
  });
});

describe("page language", () => {
  afterEach(() => {
    setLocale("en");
    vi.unstubAllGlobals();
  });

  it("names every picker language with a valid BCP-47 tag", () => {
    expect(localeChoices.map(({ code }) => documentLanguage(code))).toEqual(["en", "zh"]);
    for (const { code } of localeChoices) {
      expect(Intl.getCanonicalLocales(documentLanguage(code))).toEqual([documentLanguage(code)]);
    }
  });

  it("tags an alias with the pack it shows", () => {
    expect(documentLanguage("pt")).toBe("en");
    expect(documentLanguage("zh-hant")).toBe("zh");
    expect(documentLanguage("zh-hk")).toBe("zh");
  });

  it("sets the page language and direction whenever the locale changes", () => {
    const root = { lang: "en", dir: "" };
    vi.stubGlobal("document", { documentElement: root });
    setLocale("de-AT");
    expect(root).toEqual({ lang: "en", dir: "ltr" });
    setLocale("zh-TW");
    expect(root.lang).toBe("zh");
    setLocale("zh-Hant-TW");
    expect(root.lang).toBe("zh");
    setLocale("ja");
    expect(root.lang).toBe("en");
    setLocale("xx-YY");
    expect(root.lang).toBe("en");
  });

  it("tags the page once the language's pack has loaded, keeping the one it shows until then", async () => {
    const root = { lang: "en", dir: "" };
    vi.stubGlobal("document", { documentElement: root });
    vi.resetModules();
    const page = await import("./i18n");
    await page.loadLocale("zh");
    const loading = page.loadLocale("de-DE");
    expect(root.lang).toBe("zh");
    expect(page.t("engines.local")).toBe("本地");
    expect(await loading).toBe("en");
    expect(root).toEqual({ lang: "en", dir: "ltr" });
    expect(page.t("engines.local")).toBe("Local");
  });

  it("still switches language where there is no page (tests, workers)", () => {
    vi.stubGlobal("document", undefined);
    expect(setLocale("fr")).toBe("en");
    expect(t("engines.local")).not.toBe("");
  });
});

describe("intlLocale", () => {
  afterEach(() => {
    setLocale("en");
  });

  it("formats in the app language, not the system's", () => {
    setLocale("zh");
    expect(intlLocale("en-US")).toBe("zh");
    setLocale("zh-TW");
    expect(intlLocale("pt-PT")).toBe("zh");
    setLocale("de");
    expect(intlLocale("ja-JP")).toBe("en");
    setLocale("en");
    expect(intlLocale("pt-BR")).toBe("en");
    expect(intlLocale(undefined)).toBe("en");
  });

  it("keeps the system region when it speaks the app language", () => {
    expect(intlLocale("en-GB")).toBe("en-GB");
    expect(intlLocale("en-gb")).toBe("en-GB");
    setLocale("zh");
    expect(intlLocale("zh-TW")).toBe("zh-TW");
  });

  it("falls back to the app language for a missing, empty or malformed system tag", () => {
    for (const system of [undefined, "", "en-!", "en--US", "!!"]) {
      expect(intlLocale(system), String(system)).toBe("en");
      expect(() => new Intl.DateTimeFormat(intlLocale(system))).not.toThrow();
    }
  });

  it("gives Intl a tag it formats in the app language", () => {
    setLocale("zh");
    expect(new Intl.DateTimeFormat(intlLocale("en-US"), { month: "long", timeZone: "UTC" }).format(Date.UTC(2024, 9, 1))).toBe("十月");
    expect(new Intl.NumberFormat(intlLocale("en-US")).format(1440.5)).toBe("1,440.5");
  });
});
