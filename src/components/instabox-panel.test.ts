import { describe, expect, it } from "vitest";
import { cloudPanelStatus } from "./instabox-panel";
import { resolveBoatPanelAction } from "@/lib/local-computer";
import { placeFacts, placeViewFor } from "@/lib/place-view";
import type { Bot, InstanceInfo } from "@/state/store";

describe("InstaBox computer panel", () => {
  it.each([
    ["running", true, "attach-ready-boat"],
    ["suspended", false, "cloud-asleep"],
    ["stopped", false, "cloud-asleep"],
    [undefined, false, "cloud-new"],
  ] as const)("maps %s to the existing cloud controls", (state, ready, expected) => {
    const status = cloudPanelStatus({ backend: "instabox", configured: true, ready, machine: state ? { state } : null });
    expect(resolveBoatPanelAction({ computer: "cloud", configured: true, boatState: status.box!.state, canUseCloud: true, autoLocal: false, teamComputer: false, busy: false })).toBe(expected);
  });

  it("uses the InstaBox key and a settings hint independently of Boat or the Cloud plan", () => {
    const bot = { name: "Fixture", cloudBackend: "instabox", modelSelection: { instanceId: "fixture", model: "fixture" } } as Bot;
    const instances = [{ instanceId: "fixture", capabilities: { computerMcp: true }, snapshot: { authenticated: true, state: "available" } }] as InstanceInfo[];
    const input = { bot, instances, place: "cloud" as const, seat: { server: "linux" as const, plan: true, role: "admin" as const, mode: "simple" as const } };
    const missing = placeViewFor(placeFacts({ ...input, config: { box: { configured: true }, instabox: { configured: false, fromEnv: false } } }));
    expect(missing.line).toContain("Add your InstaBox key in Settings first");
    expect(missing.action).toBeNull();
    const ready = placeViewFor(placeFacts({ ...input, computer: "on", config: { instabox: { configured: true, fromEnv: false }, box: { configured: false } } }));
    expect(ready.state).toBe("cc-on");
    expect(ready.line).not.toContain("Boat");
  });

  it("does not call a new InstaBox desktop a Boat desktop", () => {
    const bot = { name: "Fixture", cloudBackend: "instabox", modelSelection: { instanceId: "fixture", model: "fixture" } } as Bot;
    const instances = [{ instanceId: "fixture", capabilities: { computerMcp: true }, snapshot: { authenticated: true, state: "available" } }] as InstanceInfo[];
    const view = placeViewFor(placeFacts({
      bot, instances, place: "cloud", seat: { server: "linux", plan: false, role: "admin", mode: "simple" }, computer: undefined,
      config: { instabox: { configured: true, fromEnv: false }, box: { configured: false } },
    }));
    expect(view.state).toBe("cc-new");
    expect(view.line).not.toContain("Boat");
  });
});
