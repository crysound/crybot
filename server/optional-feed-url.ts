export function optionalFeedUrl(env: NodeJS.ProcessEnv, name: string): URL | null {
  const raw = env[name]?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.username || url.password) return null;
    if (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return url;
  } catch { return null; }
  return null;
}
