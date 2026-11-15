import { describe, expect, it } from "vitest";

import en from "../../src/locales/en.json" with { type: "json" };
import { briefWords } from "./brief-words.ts";

describe.each([
  ["en", en],
] as const)("brief words in %s", (language, catalog) => {
  it("keeps retry wording in sync with the catalog", () => {
    expect(briefWords(language).tryAgainSoon).toBe(catalog["brief.row.tryAgainSoon"]);
  });

  it.each([0, 1, 3, 40])("keeps the caption for %i chats in sync with the catalog", (count) => {
    expect(briefWords(language).noticedAcross(count)).toBe(catalog["brief.row.noticedAcross"].replace("{count}", String(count)));
  });
});

describe("Chinese brief rows", () => {
  const words = briefWords("zh");

  it("provides non-empty Chinese rows and inherits English for untranslated copy", () => {
    for (const value of Object.values(words)) {
      if (typeof value === "string") expect(value.trim()).not.toBe("");
    }
    expect(words.intro).not.toBe(briefWords("en").intro);
  });

  it.each([0, 1, 3, 40])("keeps the backlog for %i emails in sync with the catalog", (count) => {
    expect(words.waitingCount(count)).toContain(String(count));
  });

  it("keeps app and bot details in sync with the catalog", () => {
    expect(words.draftReply("Ada")).toContain("Ada");
    expect(words.couldNotRead("Gmail")).toContain("Gmail");
    expect(words.unsortedNote("Scout")).toContain("Scout");
    expect(words.unpreparedNote("Scout")).toContain("Scout");
  });

  it("keeps calendar overlaps in sync with the catalog", () => {
    expect(words.overlap("Planning", "Review")).toContain("Planning");
    expect(words.overlap("Planning", "Review")).toContain("Review");
  });
});
