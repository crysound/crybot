import { describe, expect, it } from "vitest";
import { sharedScreenTarget, SHARED_LOCAL_VM_TARGET } from "./container-computer.ts";
import { localVmLayout, localVmWorkspace, screenJoinUrl } from "./local-vm-screen-layout.ts";
import { guestWorkspaceToHost } from "./bot-attachment.ts";
import type { AppConfig } from "./config.ts";

describe("screen workspace and connection boundaries", () => {
  it("maps only this screen's guest files into its own host folder", () => {
    const workspace = localVmWorkspace(sharedScreenTarget(2));
    expect(workspace.root).toBe("/home/cua/workspace/screens/s2");
    expect(guestWorkspaceToHost(`${workspace.root}/report.txt`, workspace.root, workspace.host)).toBe(`${workspace.host}/report.txt`);
    for (const path of ["/home/cua/workspace/report.txt", "/home/cua/workspace/screens/s1/private.txt", `${workspace.root}/../s1/private.txt`]) {
      expect(guestWorkspaceToHost(path, workspace.root, workspace.host)).toBeNull();
    }
    expect(localVmWorkspace(SHARED_LOCAL_VM_TARGET).root).toBe("/home/cua/workspace");
  });
  it("replaces the container password and includes the screen token in direct joins", () => {
    const url = new URL(screenJoinUrl("http://127.0.0.1:6080/vnc.html#password=container&autoconnect=1", 3, "screen-only"));
    const hash = new URLSearchParams(url.hash.slice(1));
    expect(hash.get("password")).toBe("screen-only");
    expect(hash.get("path")).toBe("websockify?token=s3");
    expect(hash.get("autoconnect")).toBe("1");
    expect(url.href).not.toContain("container");
  });
  it("uses multi-screen layout only on the shared container", () => {
    const cfg = { localVm: { mode: "shared", screens: 4 } } as AppConfig;
    expect(localVmLayout(cfg, sharedScreenTarget(2))).toBe("multi");
    expect(localVmLayout(cfg, { ...SHARED_LOCAL_VM_TARGET, key: "bot:fixture" })).toBe("single");
    expect(localVmLayout({ ...cfg, localVm: { mode: "shared", screens: 1 } }, SHARED_LOCAL_VM_TARGET)).toBe("single");
  });
});
