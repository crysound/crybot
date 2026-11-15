import { expect, it } from "vitest";
import { launchVerificationServer } from "../../scripts/control-cry.ts";
import { fixtureApi } from "../../scripts/testing/preview-fixture.ts";
import type { MapComputersPayload } from "../../shared/map-computer.ts";

it("lists only Boat bots through the isolated frames endpoint", async () => {
  const fixture = await launchVerificationServer({});
  try {
    const api = fixtureApi(fixture.info.url, { headers: { origin: fixture.info.url } });
    let boatBotId: string | undefined;
    for (const cloudBackend of [undefined, "instabox", "box"] as const) {
      const { bot } = await api("POST", "/api/bots", {
        name: `Map fixture ${cloudBackend ?? "default"}`,
        settings: { computer: "cloud", ...(cloudBackend ? { cloudBackend } : {}) },
      });
      expect(bot.cloudBackend).toBe(cloudBackend ?? "instabox");
      if (cloudBackend === "box") boatBotId = bot.id;
      const payload: MapComputersPayload = await api("GET", "/api/computers/frames");
      expect(payload.computers.map((computer) => computer.id)).toEqual(boatBotId ? [boatBotId] : []);
    }
  } finally {
    await fixture.close();
  }
});
