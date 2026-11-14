const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const TOKEN = /cry_sess_[A-Za-z0-9._~-]+/g;
const COOKIE = /cry_session_[0-9]+_[A-Za-z0-9]+/g;
const JWT = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/g;

export const PLACEHOLDERS = {
  address: "https://cry.example.com",
  token: "cry_sess_placeholder",
  cookieName: "cry_session_cookie_name",
  uuidPrefix: "00000000-0000-4000-8000-",
} as const;

function normalizeString(value: string): string {
  return value
    .replace(COOKIE, PLACEHOLDERS.cookieName)
    .replace(TOKEN, PLACEHOLDERS.token)
    .replace(JWT, "jwt_placeholder")
    .replace(UUID, `${PLACEHOLDERS.uuidPrefix}000000000000`)
    .replace(URL_PATTERN, (match) => {
      try { return new URL(match).protocol + "//cry.example.com"; } catch { return PLACEHOLDERS.address; }
    });
}

export function normalizeFixture<T>(value: T): T {
  if (typeof value === "string") return normalizeString(value) as T;
  if (Array.isArray(value)) return value.map(normalizeFixture) as T;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeFixture(item)] as const);
    return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) as T;
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(normalizeFixture(value), null, 2) + "\n";
}
