import { describe, expect, it } from "vitest";
import { cloudKindOf } from "./cloud-backend.ts";

describe("actual cloud backend", () => {
  it("defaults an omitted backend to InstaBox", () => {
    expect(cloudKindOf({})).toBe("instabox");
  });

  it.each(["box", "instabox", "vps"] as const)("preserves the explicit %s backend", (cloudBackend) => {
    expect(cloudKindOf({ cloudBackend })).toBe(cloudBackend);
  });

  it.each([undefined, "box", "instabox", "vps"] as const)("keeps team computers on Boat for %s bots", (cloudBackend) => {
    expect(cloudKindOf({ cloudBackend }, true)).toBe("box");
  });
});
