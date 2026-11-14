import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const folder = fileURLToPath(new URL("../src/locales/", import.meta.url));
const prefix = "\0locale-bundle:";
const contractsId = "virtual:english-contracts";

export function localeBundles(): Plugin {
  return {
    name: "locale-bundles",
    enforce: "pre",
    resolveId(source, importer) {
      if (source === contractsId) return `\0${contractsId}`;
      if (!source.endsWith(".json?locale") || !importer) return;
      const path = resolve(dirname(importer), source.slice(0, -"?locale".length));
      if (dirname(path) === resolve(folder)) return `${prefix}${path}.js`;
    },
    load(id) {
      if (!id.startsWith(prefix) && id !== `\0${contractsId}`) return;
      const englishPath = resolve(folder, "en.json");
      this.addWatchFile(englishPath);
      const english = JSON.parse(readFileSync(englishPath, "utf8")) as Record<string, string>;
      if (id === `\0${contractsId}`) {
        const contracts = Object.fromEntries(Object.entries(english).filter(([key]) =>
          /^(?:engines\.defaultName\.|routines\.server\.|chat\.notice\.)/.test(key)));
        return `export const localeKeyCount = ${Object.keys(english).length}; export const englishContracts = ${JSON.stringify(contracts)};`;
      }
      const path = id.slice(prefix.length, -3);
      this.addWatchFile(path);
      const translated = JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
      const missing = Object.keys(english).filter((key) => !Object.hasOwn(translated, key));
      return `export default ${JSON.stringify({ ...english, ...translated })}; export const missingKeys = ${JSON.stringify(missing)};`;
    },
  };
}
