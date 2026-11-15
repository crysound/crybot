import { describe, expect, it } from "vitest";

import { SUPPORTED_LANGUAGE_CODES, supportedLanguage } from "./languages.ts";

describe("supported interface languages", () => {
  it("keeps the picker set centralized", () => {
    expect(SUPPORTED_LANGUAGE_CODES).toEqual(["en", "zh"]);
  });

  it("maps saved and system language variants to the remaining packs", () => {
    expect(supportedLanguage("zh-TW")).toBe("zh");
    expect(supportedLanguage("zh-Hant-TW")).toBe("zh");
    expect(supportedLanguage("zh_CN")).toBe("zh");
    expect(supportedLanguage("de-DE")).toBe("en");
    expect(supportedLanguage("pt-BR")).toBe("en");
    expect(supportedLanguage("unknown")).toBeUndefined();
  });
});
