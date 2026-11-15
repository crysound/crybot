import { afterEach, expect, it, vi } from "vitest";
import { createInstaboxWiring } from "./wiring.ts";

afterEach(() => vi.unstubAllEnvs());

it.each(["deleted", "backend changed", "key changed"])("revalidates a retained viewer target after the lifecycle claim when %s", async reason => {
  vi.stubEnv("INSTABOX_API_KEY", "instabox-e2e-fixture");
  let eligible = true;
  const release = vi.fn();
  const claim = vi.fn(() => {
    if (reason === "key changed") vi.stubEnv("INSTABOX_API_KEY", "instabox-e2e-replacement");
    else eligible = false;
    return release;
  });
  const wiring = createInstaboxWiring({ cfg: () => ({}), eligible: () => eligible, claim, inUse: () => false });
  const ensure = vi.spyOn(wiring.machines()!, "ensureRunning").mockRejectedValue(new Error("Unexpected machine startup"));
  const target = wiring.target("fixture-bot")!;
  await expect(target.resolve()).rejects.toThrow("unavailable");
  expect(claim).toHaveBeenCalledWith("fixture-bot", true);
  expect(release).toHaveBeenCalledOnce();
  expect(ensure).not.toHaveBeenCalled();
});

it("ignores the loopback API override outside a test environment", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VITEST", "");
  vi.stubEnv("CRYBOT_TEST_SEALED_PATH", "");
  vi.stubEnv("INSTABOX_API_KEY", "instabox-e2e-fixture");
  vi.stubEnv("CRYBOT_TEST_INSTABOX_API", "http://127.0.0.1:43210");
  const wiring = createInstaboxWiring({ cfg: () => ({}), eligible: () => true, claim: () => () => {}, inUse: () => false });
  expect(wiring.allowInsecureLoopbackUpstream).toBe(false);
});
