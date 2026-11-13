import { expect, it, vi } from "vitest";
import { configuredPhoneRelay } from "./phone-relay-config.ts";

it("does not contact anything without an explicit relay origin", () => {
  const request = vi.fn<typeof fetch>();
  for (const value of [undefined, "", "https://user:pass@relay.example.test", "http://relay.example.test", "wss://relay.example.test/path", "invalid"]) {
    expect(configuredPhoneRelay({ CRYBOT_PHONE_RELAY_URL: value }, request)).toBeNull();
  }
  expect(request).not.toHaveBeenCalled();
});

it("gets a grant only from the configured service and pins sockets to its origin", async () => {
  const request = vi.fn(async () => new Response(JSON.stringify({ token: "a.b" })));
  const relay = configuredPhoneRelay({ CRYBOT_PHONE_RELAY_URL: "wss://relay.example.test:9443", CRYBOT_PHONE_RELAY_TOKEN: "operator-token" }, request)!;
  expect(relay.socketOrigin).toBe("wss://relay.example.test:9443");
  expect(await relay.grant({ e2e: 2, legacy: 0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBeenCalledExactlyOnceWith("https://relay.example.test:9443/v1/relay-token", expect.objectContaining({
    method: "POST", redirect: "error", headers: { "content-type": "application/json", authorization: "Bearer operator-token" },
    body: '{"devices":{"e2e":2,"legacy":0},"kind":"server"}',
  }));
});
