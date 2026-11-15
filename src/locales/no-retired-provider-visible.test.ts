import en from "./en.json";
import zh from "./zh.json";
import { describe, expect, it } from "vitest";

describe("retired provider is absent from user-visible locale strings", () => {
  it.each([["en", en], ["zh", zh]] as const)("%s has no retired provider name in values", (_locale, messages) => {
    const visible = Object.entries(messages).filter(([, value]) => /boat/i.test(value));
    expect(visible).toEqual([]);
    expect(Object.keys(messages).filter(key => key.startsWith("boatOffer."))).toEqual([]);
    expect(Object.entries(messages).filter(([key, value]) => /^(vm\.cloud\.|canvasComputers\.)/.test(key) && /InstaBox/.test(value))).toEqual([]);
  });
});
