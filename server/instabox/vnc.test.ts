import { expect, it, vi } from "vitest";
import { instaboxDesktopTarget } from "./vnc.ts";

it("resolves fresh server-only upstream credentials without a VNC password", async () => {
  const upstream = vi.fn(async () => ({ url: "wss://api.instabox.sh/v1/machines/fixture/vnc", headers: { "X-API-Key": "synthetic-key" } }));
  const live = vi.fn(() => true);
  const touch = vi.fn();
  const target = instaboxDesktopTarget("instabox/bot/machine", upstream, { live, touch });
  expect(target.key).toBe("instabox/bot/machine");
  expect(upstream).not.toHaveBeenCalled();
  expect(await target.resolve()).toEqual({ port: 0, password: null, upstream: await upstream(), live, touch });
  upstream.mockResolvedValue({ url: "wss://api.instabox.sh/v1/machines/replacement/vnc", headers: { "X-API-Key": "synthetic-rotated-key" } });
  expect((await target.resolve()).upstream?.headers["X-API-Key"]).toBe("synthetic-rotated-key");
  expect(live).not.toHaveBeenCalled();
  expect(touch).not.toHaveBeenCalled();
});

it("propagates provider failures to the route's sanitized error boundary", async () => {
  const error = Object.assign(new Error("synthetic provider details"), { status: 409 });
  const target = instaboxDesktopTarget("instabox/bot/machine", async () => { throw error; });
  await expect(target.resolve()).rejects.toBe(error);
});
