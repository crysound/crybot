import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fakeInstaboxCore } from "../testing/fake-instabox-core.ts";
import { createInstaboxRequest, InstaboxError, instaboxVncUpstream, waitOperation } from "./client.ts";

let fake: Awaited<ReturnType<typeof fakeInstaboxCore>>;
beforeEach(async () => { fake = await fakeInstaboxCore(); });
afterEach(async () => { vi.restoreAllMocks(); await fake.close(); });

it("authenticates and gives each lifecycle call its own idempotency key", async () => {
  const request = createInstaboxRequest("fixture-key", fake.url);
  await request("GET", "/v1/machines", { query: { name: "crybot-test" } });
  await request("POST", "/v1/machines", { body: { name: "a" }, idempotent: true });
  await request("POST", "/v1/machines", { body: { name: "b" }, idempotent: true });
  expect(fake.calls[0].headers["x-api-key"]).toBe("fixture-key");
  expect(fake.calls[0].headers["idempotency-key"]).toBeUndefined();
  expect(fake.calls[0].query.get("name")).toBe("crybot-test");
  expect(fake.calls[1].headers["idempotency-key"]).toMatch(/^[a-f0-9-]{36}$/);
  expect(fake.calls[1].headers["idempotency-key"]).not.toBe(fake.calls[2].headers["idempotency-key"]);
});

it("reports HTTP status and safe error codes without reflecting secrets or remote messages", async () => {
  const request = createInstaboxRequest("fixture_secret", fake.url);
  fake.failNext({ status: 403, code: "permission_denied", message: "fixture_secret" });
  await expect(request("GET", "/v1/machines")).rejects.toMatchObject({ status: 403, code: "permission_denied", message: "InstaBox HTTP 403: permission_denied" });
  fake.failNext({ status: 400, code: "fixture_secret" });
  await expect(request("GET", "/v1/machines")).rejects.toThrow("InstaBox HTTP 400: request_failed");
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fixture_secret"));
  await expect(request("GET", "/v1/machines")).rejects.toThrow(new InstaboxError(0, "network_error"));
});

it("rejects foreign origins before sending the key and refuses redirects", async () => {
  const request = createInstaboxRequest("fixture-key", fake.url);
  await expect(request("GET", "https://example.com")).rejects.toThrow("Invalid InstaBox API path");
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
  await request("GET", "/v1/machines");
  expect(fetchSpy.mock.calls[0][1]?.redirect).toBe("error");
});

it("waits with 25s polling, reports failure, and bounds a stalled request", async () => {
  const request = createInstaboxRequest("fixture-key", fake.url);
  const operation = await (await request("POST", "/v1/machines", { body: { name: "a" }, idempotent: true })).json() as { id: string };
  await waitOperation(request, operation.id, 1000);
  expect(fake.calls.filter(call => call.path.includes("operations")).map(call => call.query.get("wait"))).toEqual(["25s", "25s"]);
  fake.failOperations();
  await expect(waitOperation(request, operation.id, 1000)).rejects.toThrow("InstaBox operation failed");
  await expect(waitOperation(() => new Promise(() => {}), "op-stalled", 20)).rejects.toThrow("InstaBox operation timed out");
});

it("keeps VNC credentials server-side and follows HTTPS and HTTP origins", () => {
  expect(instaboxVncUpstream(createInstaboxRequest("fixture-key"), "a/b")).toEqual({
    url: "wss://api.instabox.sh/v1/machines/a%2Fb/vnc", headers: { "X-API-Key": "fixture-key" },
  });
  expect(instaboxVncUpstream(createInstaboxRequest("fixture-key", fake.url), "a").url).toBe(`${fake.url.replace("http:", "ws:")}/v1/machines/a/vnc`);
});

it("rejects malformed keys without including their value in errors", () => {
  expect(() => createInstaboxRequest("fixture-secret\n" )).toThrow("Invalid InstaBox API key");
});
