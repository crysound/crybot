import { describe, expect, it } from "vitest";

import { FINAL_ACTIONS, SECRET_FIELDS } from "../../server/saved-steps/screen-words";

describe("the words saved steps look for on another app's screen", () => {
  it("keep safety coverage independent of the interface languages", () => {
    const required = ["en", "zh", "de", "es", "fr", "it", "pt-br", "pl", "ru", "uk", "tr", "vi", "hi", "ja", "ko", "zh-tw"];
    expect(Object.keys(FINAL_ACTIONS)).toEqual(expect.arrayContaining(required));
    expect(Object.keys(SECRET_FIELDS)).toEqual(expect.arrayContaining(required));
  });
});
