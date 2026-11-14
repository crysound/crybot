import { hostname, homedir } from "node:os";

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
export const PLACEHOLDERS = {
  address: "https://cry.example.com",
  token: "cry_sess_placeholder",
  cookieName: "cry_session_cookie_name",
  uuidPrefix: "00000000-0000-4000-8000-",
} as const;
export const codepointOrder = (a: string, b: string): number => {
  const left = Array.from(a, c => c.codePointAt(0)!);
  const right = Array.from(b, c => c.codePointAt(0)!);
  for (let i = 0; i < Math.min(left.length, right.length); i++) if (left[i] !== right[i]) return left[i] - right[i];
  return left.length - right.length;
};

export function normalizeFixture(value: unknown): unknown {
  const ids = new Map<string, string>();
  const cursors = new Map<string, string>();
  const identifier = (input: string): string => {
    const raw = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input) ? input.toLowerCase() : input;
    if (!ids.has(raw)) ids.set(raw, `${PLACEHOLDERS.uuidPrefix}${String(ids.size).padStart(12, "0")}`);
    return ids.get(raw)!;
  };
  const string = (raw: string): string => raw
    .replace(/cry_session_[0-9]+_[A-Za-z0-9]+/g, PLACEHOLDERS.cookieName)
    .replace(/cry_sess_[A-Za-z0-9._~-]+/g, PLACEHOLDERS.token)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "jwt_placeholder")
    .replace(/https?:\/\/[^\s"'<>]+/g, PLACEHOLDERS.address)
    .replace(/[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "person@example.com")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/g, "cry.example.com")
    .replace(UUID, rawId => identifier(rawId.toLowerCase()))
    .replace(/\b\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z\b/g, "2026-01-01T00:00:00.000Z")
    .replaceAll(hostname(), "fixture-host")
    .replaceAll(homedir(), "/fixture/home")
    .replace(/(?:\/[^\s"']*)?\/crybot-verify-data-[^/\s"']+/g, "/fixture/data");
  function visit(item: unknown, key = ""): unknown {
    if (item === null || item === undefined) return item;
    if (typeof item === "string") {
      if (item.startsWith("/") && !item.startsWith("/api/")) return "/fixture/path";
      if (/port$/i.test(key)) return "443";
      if (/cursor/i.test(key)) {
        if (!cursors.has(item)) cursors.set(item, `cursor-${cursors.size}`);
        return cursors.get(item);
      }
      if (/^(?:hostname|hostName|computerName|serverName)$/.test(key)) return "Example device";
      if (/(?:^ids?$|Id$|Ids$)/.test(key) && item) return identifier(item);
      return string(item);
    }
    if (typeof item === "number") {
      if (/(?:^at$|At$|^timestamp$|^expires$|^scheduledFor$)/.test(key)) return item === 0 ? 0 : 1767225600000;
      if (/(?:duration|elapsed|latency|waited|delay)Ms$/i.test(key)) return 1000;
      if (/port$/i.test(key)) return 443;
      if (/cursor/i.test(key)) return 0;
      return item;
    }
    if (Array.isArray(item)) return item.map(entry => visit(entry, key));
    if (typeof item === "object") return Object.fromEntries(Object.entries(item).sort(([a], [b]) => codepointOrder(a, b)).map(([k, v]) => [string(k), k === "label" && "environmentId" in item ? "Example device" : visit(v, k)]).sort(([a], [b]) => codepointOrder(String(a), String(b))));
    return item;
  }
  function register(item: unknown, key = ""): void {
    if (typeof item === "string") {
      if (/(?:^ids?$|Id$|Ids$)/.test(key) && item) identifier(item);
      else for (const match of item.matchAll(UUID)) identifier(match[0].toLowerCase());
    } else if (Array.isArray(item)) item.forEach(v => register(v, key));
    else if (item && typeof item === "object") Object.entries(item).forEach(([k, v]) => {
      if (["queues", "threads", "byId", "memberContext", "holds", "heldMessages"].includes(key)) identifier(k);
      else register(k);
      register(v, k);
    });
  }
  register(value);
  const normalized = visit(value);
  function mapReferences(item: unknown): unknown {
    if (typeof item === "string") return ids.get(item) ?? item;
    if (Array.isArray(item)) return item.map(mapReferences);
    if (item && typeof item === "object") return Object.fromEntries(Object.entries(item).map(([k, v]) => [ids.get(k) ?? k, mapReferences(v)]).sort(([a], [b]) => codepointOrder(String(a), String(b))));
    return item;
  }
  return mapReferences(normalized);
}

export function stableJson(value: unknown): string {
  return JSON.stringify(normalizeFixture(value), null, 2) + "\n";
}
