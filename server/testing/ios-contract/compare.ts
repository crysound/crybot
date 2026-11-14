import { readFileSync } from "node:fs";

export function compareJsonFiles(expectedPath: string, actualPath: string): boolean {
  return readFileSync(expectedPath, "utf8") === readFileSync(actualPath, "utf8");
}
