import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";

const isLiveFile = (file: string): boolean => basename(file).startsWith("live-");

function typedIndex(text: string): string {
  const index: unknown = JSON.parse(text);
  if (!Array.isArray(index)) throw new Error("Contract index must be an array");
  return JSON.stringify(index.filter((entry: unknown) => {
    if (!entry || typeof entry !== "object" || !("file" in entry) || typeof entry.file !== "string") throw new Error("Contract index entry must contain a file path");
    return !isLiveFile(entry.file);
  }));
}

async function files(root: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(join(root, prefix), { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const result: string[] = [];
  for (const entry of entries) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(root, path));
    else result.push(path);
  }
  return result;
}

export async function compareDirectories(expected: string, actual: string, options: { typedOnly?: boolean } = {}): Promise<string[]> {
  const [left, right] = await Promise.all([files(expected), files(actual)]);
  const changed: string[] = [];
  for (const file of new Set([...left, ...right])) {
    if (options.typedOnly && isLiveFile(file)) continue;
    if (!left.includes(file) || !right.includes(file)) { changed.push(file); continue; }
    const [a, b] = await Promise.all([readFile(join(expected, file)), readFile(join(actual, file))]);
    if (options.typedOnly && file === "index.json") {
      if (typedIndex(a.toString()) !== typedIndex(b.toString())) changed.push(file);
    } else if (!a.equals(b)) changed.push(file);
  }
  return changed.sort();
}
