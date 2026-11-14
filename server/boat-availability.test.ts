import { afterEach, expect, it, vi } from "vitest";
import { boatConfigured } from "./boat.ts";

afterEach(() => vi.unstubAllEnvs());

it("disables Boat while providers are locked and restores it when unlocked", async () => {
  const cfg = { box: { token: "boat_fixture" } };
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "0");
  expect(boatConfigured(cfg)).toBe(true);
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "1");
  expect(boatConfigured(cfg)).toBe(false);
  expect(cfg.box.token).toBe("boat_fixture");
  vi.stubEnv("CRYBOT_PROVIDER_LOCK", "0");
  expect(boatConfigured(cfg)).toBe(true);
});
