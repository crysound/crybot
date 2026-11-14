import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

import * as readyLocales from "../locales/index.ts";
import type { LocalePack } from "../locales/index.ts";

const { loadLocalePack, localePacks, locales } = readyLocales;
await loadLocalePack("en");

const folder = join(dirname(fileURLToPath(import.meta.url)), "..", "locales");
const read = new Map<string, LocalePack>();
const pack = (name: string): LocalePack => {
  let found = read.get(name);
  if (!found) read.set(name, found = JSON.parse(readFileSync(join(folder, `${name}.json`), "utf8")) as LocalePack);
  return found;
};
for (const [tag, name] of Object.entries(localePacks)) {
  if (!(tag in locales)) Object.defineProperty(locales, tag, { configurable: true, enumerable: true, get: () => pack(name) });
}

vi.doMock("../locales/index.ts", () => readyLocales);
