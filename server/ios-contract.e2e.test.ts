import { describe, expect, it } from "vitest";
import { launchAndCapture } from "./testing/ios-contract/live.ts";

const enabled = process.env.CRYBOT_RUN_IOS_CONTRACT_E2E === "1";
describe("iOS live contract capture", () => {
  it.skipIf(!enabled)("captures isolated verification responses", async () => {
    const { server, capture } = await launchAndCapture();
    try {
      expect(capture.bots).toBeDefined();
      expect(capture.environment).toBeDefined();
      expect(capture.session).toBeDefined();
    } finally {
      await server.close();
    }
  }, 180_000);
});
