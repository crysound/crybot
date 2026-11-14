import { CALL_TOOL, directoryCallTarget } from "./mcp-directory.ts";

export function computerToolTitle(name: string, input?: unknown): string {
  const match = /^(mcp__computer__|computer__|computer_)call_tool$/.exec(name);
  if (!match) return name;
  if (typeof input === "string") {
    try { input = JSON.parse(input); } catch { return name; }
  }
  const target = directoryCallTarget(CALL_TOOL, input);
  return target ? `${match[1]}${target}` : name;
}
