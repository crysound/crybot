import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { npmEnginesPrefix } from "../engine-roots.ts";

export function fixtureEnginePath(dataDir: string, name: string): string {
  const bin = join(npmEnginesPrefix(dataDir), "bin");
  mkdirSync(bin, { recursive: true });
  return join(bin, name);
}
