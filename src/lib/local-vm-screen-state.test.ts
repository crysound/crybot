import { describe, expect, it } from "vitest";
import { localVmPollInterval, localVmTakeoverSession, localVmUnassignedStatus, localVmViewerTarget, localVmWaitState, type LocalVmStatus } from "./local-vm-screen-state";

const status = (patch: Partial<LocalVmStatus> = {}): LocalVmStatus => ({
  mode: "shared", max_instances: 1, image: true, create_supported: true, container: "running",
  imageMatches: true, managed: true, network: "loopback", security: "hardened", persistence: "durable",
  desktopReady: true, ready: true, problem: null, viewer_url: "http://viewer", target_key: "shared", ...patch,
});

describe("local VM screen state", () => {
  it("distinguishes queued and unassigned screens", () => {
    expect(localVmWaitState(status({ screen: null }))).toBe("unassigned");
    expect(localVmWaitState(status({ screen: null, queue_position: 2 }))).toBe("queued");
    expect(localVmWaitState(status({ screen: { screen: 2, viewerTarget: "local/shared-s2" } }))).toBeNull();
  });

  it("polls unassigned screens less often than the queue", () => {
    expect(localVmPollInterval(status({ screen: null }))).toBe(15_000);
    expect(localVmPollInterval(status({ screen: null, queue_position: 1 }))).toBe(2_000);
  });

  it("uses the explicit screen target and preserves the single screen fallback", () => {
    expect(localVmViewerTarget(status({ screen: { screen: 3, viewerTarget: "local/shared-s3" } }))).toBe("local/shared-s3");
    expect(localVmViewerTarget(status())).toBe("local/shared");
    expect(localVmViewerTarget(status({ screen: null }))).toBeNull();
  });

  it("does not carry a previous bot's screen into a new takeover session", () => {
    expect(localVmTakeoverSession("bot-a", "computer", null)).toBe("bot-a:computer");
    expect(localVmTakeoverSession("bot-b", "computer", "local/shared-s2")).toBe("bot-b:computer:local/shared-s2");
  });

  it("clears queue information after an unassigned conflict", () => {
    const cleared = localVmUnassignedStatus(status({ screen: null, queue_position: 3 }));
    expect(cleared?.screen).toBeNull();
    expect(cleared?.queue_position).toBeUndefined();
    expect(localVmPollInterval(cleared!)).toBeGreaterThanOrEqual(15_000);
  });
});
