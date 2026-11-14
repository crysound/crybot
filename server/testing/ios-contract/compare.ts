import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

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

export async function compareDirectories(expected: string, actual: string): Promise<string[]> {
  const [left, right] = await Promise.all([files(expected), files(actual)]);
  const changed: string[] = [];
  for (const file of new Set([...left, ...right])) {
    if (!left.includes(file) || !right.includes(file)) { changed.push(file); continue; }
    const [a, b] = await Promise.all([readFile(join(expected, file)), readFile(join(actual, file))]);
    if (!a.equals(b)) changed.push(file);
  }
  return changed.sort();
}
