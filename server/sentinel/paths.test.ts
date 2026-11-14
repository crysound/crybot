import { describe, expect, it } from "vitest";

import { defaultSentinelOut, isInside } from "./paths.ts";

describe("sentinel paths", () => {
  it("keeps Sentinel's files in the platform's state folder, outside the data dir", () => {
    expect(defaultSentinelOut("/Users/bot/.crybot", "darwin", "/Users/bot", {})).toBe("/Users/bot/Library/Application Support/crybot-sentinel");
    expect(defaultSentinelOut("/home/bot/.crybot", "linux", "/home/bot", {})).toBe("/home/bot/.local/state/crybot-sentinel");
    expect(defaultSentinelOut("/home/bot/.crybot", "linux", "/home/bot", { XDG_STATE_HOME: "/var/state/bot" })).toBe("/var/state/bot/crybot-sentinel");
    // a relative XDG_STATE_HOME is invalid by the spec and ignored
    expect(defaultSentinelOut("/home/bot/.crybot", "linux", "/home/bot", { XDG_STATE_HOME: "state" })).toBe("/home/bot/.local/state/crybot-sentinel");
    expect(defaultSentinelOut("C:\\Users\\bot\\.crybot", "win32", "C:\\Users\\bot", { LOCALAPPDATA: "D:\\Local" })).toBe("D:\\Local\\crybot-sentinel");
  });

  it("gives any other data dir its own subfolder, the same one every time", () => {
    const other = defaultSentinelOut("/srv/cry-data", "linux", "/home/bot", {});
    expect(other).toMatch(/^\/home\/bot\/\.local\/state\/crybot-sentinel\/data-[0-9a-f]{12}$/);
    expect(defaultSentinelOut("/srv/cry-data", "linux", "/home/bot", {})).toBe(other);
    expect(defaultSentinelOut("/srv/cry-data-2", "linux", "/home/bot", {})).not.toBe(other);
  });

  it("knows when a folder is inside another", () => {
    expect(isInside("/d/cry/sentinel", "/d/cry", "linux")).toBe(true);
    expect(isInside("/d/cry", "/d/cry", "linux")).toBe(true);
    expect(isInside("/d/cry-sentinel", "/d/cry", "linux")).toBe(false);
    expect(isInside("/d", "/d/cry", "linux")).toBe(false);
    expect(isInside("C:\\d\\cry\\x", "C:\\d\\cry", "win32")).toBe(true);
  });
});
