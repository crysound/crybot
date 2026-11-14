export function configuredPhoneRelay(env: NodeJS.ProcessEnv, request: typeof fetch = fetch) {
  const raw = env.CRYBOT_PHONE_RELAY_URL?.trim();
  if (!raw) return null;
  let endpoint: URL;
  try { endpoint = new URL(raw); } catch { return null; }
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== "/") return null;
  const secure = endpoint.protocol === "https:" || endpoint.protocol === "wss:";
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if (!secure && !(local && ["http:", "ws:"].includes(endpoint.protocol))) return null;
  endpoint.protocol = secure ? "https:" : "http:";
  const grantUrl = new URL("/v1/relay-token", endpoint).href;
  endpoint.protocol = secure ? "wss:" : "ws:";
  const socketOrigin = endpoint.origin;
  return {
    socketOrigin,
    async grant(devices: { e2e: number; legacy: number }) {
      const credential = env.CRYBOT_PHONE_RELAY_TOKEN?.trim();
      const response = await request(grantUrl, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(8_000),
        headers: { "content-type": "application/json", ...(credential ? { authorization: `Bearer ${credential}` } : {}) },
        body: JSON.stringify({ devices, kind: "server" }),
      });
      if (!response.ok) throw Object.assign(new Error(`Phone relay answered ${response.status}`), { status: response.status });
      return response.json() as Promise<unknown>;
    },
  };
}
