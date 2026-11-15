import { expect, it } from "vitest";

import { SUPPORTED_LANGUAGE_CODES } from "../../shared/languages";
import { locales } from "./index";

it("words the unreadable-credential-store notice for any device, never calling it a Mac", () => {
  const packs = Object.entries(locales) as Array<[string, Record<string, string | undefined>]>;
  expect(packs.map(([language]) => language)).toEqual([...SUPPORTED_LANGUAGE_CODES]);
  for (const [language, pack] of packs) {
    expect(pack["connectors.stale"], language).toBeTruthy();
    expect(pack["connectors.stale"], language).not.toMatch(/Mac/);
  }
});
