// @vitest-environment happy-dom
// Take control where the person watches: the real panel, its real control requests, a stand-in for the live desktop.
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/state/api";
import { t } from "@/lib/i18n";
import type { Action, AppState, Bot, InstanceInfo } from "@/state/store";

const fixture = vi.hoisted(() => ({
  vm: {} as Record<string, unknown>,
  vmRequests: [] as string[],
  vmForegroundRequests: 0,
  assignment: null as Record<string, unknown> | null,
  assignPaths: [] as string[],
  nextVmStatus: null as Promise<Record<string, unknown>> | null,
  assignedOpen: null as Promise<void> | null,
  nextTake: null as Promise<void> | null,
  takeoverRenders: [] as Array<{ botId: string; session: string }>,
  liveRenders: [] as Array<{ name: string; target: string }>,
  held: false,
  /** Whether a take with a lease gets it: false plays a hold someone else already has. */
  owned: true,
  /** True plays a take the server turns down. */
  refuse: false,
  controls: [] as Array<{ action?: string; controlLeaseId?: string }>,
  controlPaths: [] as string[],
  posts: [] as string[],
  beacons: [] as Array<{ url: string; body: Record<string, unknown>; keepalive: boolean }>,
  live: null as null | { target: string; expanded: boolean; onUnreachable: () => void },
}));
vi.mock("./AssignLocalVmScreen", async (importOriginal) => {
  const { AssignLocalVmScreen } = await importOriginal<typeof import("./AssignLocalVmScreen")>();
  return { AssignLocalVmScreen: (props: Parameters<typeof AssignLocalVmScreen>[0]) => createElement(AssignLocalVmScreen, {
    ...props,
    onAssigned: () => {
      fixture.assignedOpen = props.onAssigned();
      return fixture.assignedOpen;
    },
  }) };
});
vi.mock("./DesktopCapabilities", async (importOriginal) => ({
  ...await importOriginal<typeof import("./DesktopCapabilities")>(),
  useCaptionChrome: () => ({ padClass: undefined }),
  useDesktopCapabilities: () => ({
    ready: true,
    capabilities: {
      host: { platform: "darwin", label: "Host", session: "unknown", packaged: true, homeDir: "/Users/me" },
      windowChrome: "native",
      screenPreview: { available: false, interaction: "none" },
      dictation: { available: false, engine: "none", onDevice: false },
      localComputer: { available: false, support: "unsupported", enabled: false, status: "unavailable" },
    },
  }),
}));
vi.mock("@/lib/interface-mode", () => ({ useAdvancedMode: () => false, setAdvancedMode: () => {} }));
vi.mock("./CloudScreenPreview", () => ({
  CloudScreenPreview: ({ onOpen }: { onOpen: () => void }) => createElement("button", { "data-preview": "", onClick: onOpen }, "preview"),
}));
vi.mock("./LiveDesktop", () => ({
  LiveDesktop: (props: { name: string; target: string; expanded: boolean; onUnreachable: () => void }) => {
    fixture.live = props;
    fixture.liveRenders.push({ name: props.name, target: props.target });
    return createElement("div", { "data-live-desktop": "", "data-target": props.target, "data-expanded": String(props.expanded) });
  },
}));
vi.mock("./computer-takeover", async (importOriginal) => {
  const original = await importOriginal<typeof import("./computer-takeover")>();
  return {
    ...original,
    useComputerTakeover: (options: Parameters<typeof original.useComputerTakeover>[0]) => {
      fixture.takeoverRenders.push({ botId: options.botId, session: options.session });
      return original.useComputerTakeover(options);
    },
  };
});
vi.mock("./AndroidDevicePanel", () => ({ AndroidDevicePanel: () => null, useAndroidUsbDevices: () => ({ devices: [] }) }));
vi.mock("./BrowserPanel", () => ({ BrowserPanel: () => null }));
vi.mock("./CloudBackendPicker", () => ({ CloudBackendPicker: () => null }));
vi.mock("./bot-settings/RoutinesSection", () => ({ RoutinesSection: () => null }));
vi.mock("@/state/store", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/state/store")>(),
  api: async (path: string, init?: RequestInit & { background?: boolean }) => {
    const route = path.split("?")[0]!;
    if (init?.method === "POST") fixture.posts.push(route);
    if (route === "/api/bots/scout/computer/control") {
      fixture.controlPaths.push(path);
      if (init?.method !== "POST") return { held: fixture.held, helpReason: null };
      const body = JSON.parse(String(init.body));
      fixture.controls.push(body);
      if (body.action === "take") {
        if (fixture.nextTake) await fixture.nextTake;
        if (fixture.refuse) return { held: false, helpReason: null };
        const owned = !fixture.held || fixture.owned;
        fixture.held = true;
        return { held: true, helpReason: null, ...(body.controlLeaseId ? { owned: owned && fixture.owned, acquired: owned } : {}) };
      }
      fixture.held = false;
      return { held: false, helpReason: null };
    }
    if (route === "/api/bots/scout/local-computer/assign-screen") {
      fixture.assignPaths.push(path);
      fixture.vm = fixture.assignment!;
      return fixture.vm;
    }
    if (route === "/api/bots/scout/local-computer" || route === "/api/bots/rover/local-computer") {
      fixture.vmRequests.push(path);
      if (!init?.background) fixture.vmForegroundRequests += 1;
      if (fixture.nextVmStatus) return fixture.nextVmStatus;
      if (fixture.vm.statusError) throw new Error(String(fixture.vm.statusError));
      if (fixture.vm.unassigned) throw new ApiError("screen_not_assigned", 409, { error: "screen_not_assigned" });
      return {
        mode: "per-bot", max_instances: 2, image: true, create_supported: true, container: "running", imageMatches: true,
        managed: true, network: "loopback", security: "hardened", persistence: "durable", desktopReady: true, ready: true,
        problem: null, viewer_url: "http://127.0.0.1:49152/vnc.html#password=fixture", target_key: `bot:${"a".repeat(64)}`,
        ...fixture.vm,
      };
    }
    if (route === "/api/bots/scout/local-computer/screenshot") return { image: "data:image/png;base64,FRAME" };
    if (route === "/api/bots/scout/computer") {
      return { configured: true, ready: true, managed: true, imageMatches: true, container: "running", problem: null, box: { state: "ready" } };
    }
    if (route === "/api/bots/scout/computer/screenshot") return { png: "FRAME", format: "png" };
    if (route === "/api/bots/scout/computer/join") return { joinUrl: "https://desktop.invalid/scout" };
    return {};
  },
}));

const { ComputerPanel } = await import("./ComputerPanel");
const { BotEditorStore, initialState } = await import("@/state/store");

const engine = {
  instanceId: "claude", driverKind: "claudeAgent", displayName: "Claude", access: "subscription",
  snapshot: { state: "available", version: "1", authenticated: true },
  models: { default: "m", options: [{ id: "m", label: "M" }] },
  capabilities: { computerMcp: true, browserMcp: true },
} as InstanceInfo;
const makeBot = (patch: Partial<Bot> = {}): Bot => ({
  id: "scout", threadId: "thread", name: "Scout", title: "", description: "", color: "green",
  notifications: true, unread: false, busy: true, messages: [],
  modelSelection: { instanceId: "claude", model: "m" },
  tasks: [{ threadId: "thread", title: "Thread", createdAt: 1, approvalMode: "ask" }],
  ...patch,
}) as unknown as Bot;

let root: Root | null = null;
let state: AppState;
let shown: Bot;
const draw = () => flushSync(() => root!.render(createElement(BotEditorStore, {
  value: {
    state,
    dispatch: (action: Action) => {
      if (action.type !== "computerControl") return;
      state = { ...state, computerControl: { ...state.computerControl, [action.botId]: { held: action.held, helpReason: action.helpReason, help: action.help } } };
      queueMicrotask(() => { if (root) draw(); });
    },
    flushBotPatches: async () => null,
    refreshInstances: async () => {},
    refreshModels: async () => {},
  },
  children: createElement(ComputerPanel, { bot: shown }),
})));
const settle = async () => {
  for (let i = 0; i < 25; i++) {
    if (vi.isFakeTimers()) {
      await vi.advanceTimersByTimeAsync(0);
      flushSync(() => {});
    } else {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
};
const open = async (bot: Bot) => {
  shown = bot;
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  draw();
  await settle();
};
const button = (label: string) => [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === label);
const press = async (label: string) => {
  const target = button(label);
  expect(target, `no "${label}" button in: ${document.body.textContent}`).toBeDefined();
  flushSync(() => target!.click());
  await settle();
};
const liveDesktop = () => document.querySelector<HTMLElement>("[data-live-desktop]");
const shownLive = () => vi.waitFor(() => expect(liveDesktop(), "the live desktop must replace the picture, here").not.toBeNull());
/** What the server's broadcast does to every open view. */
const heldElsewhere = (held: boolean) => {
  state = { ...state, computerControl: { ...state.computerControl, scout: { held, helpReason: null } } };
  if (root) draw();
};
const releases = () => fixture.beacons.filter((beacon) => beacon.url === "/api/bots/scout/computer/control" && beacon.body.action === "release");

beforeEach(() => {
  // The panel remembers each conversation's tab (computer-panel-view.ts), so one test's tab must not open the next test on it.
  const saved = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => void saved.set(key, value),
    removeItem: (key: string) => void saved.delete(key),
  });
  fixture.vm = {};
  fixture.vmRequests = [];
  fixture.vmForegroundRequests = 0;
  fixture.nextVmStatus = null;
  fixture.assignedOpen = null;
  fixture.nextTake = null;
  fixture.takeoverRenders = [];
  fixture.liveRenders = [];
  fixture.held = false;
  fixture.owned = true;
  fixture.refuse = false;
  fixture.controls = [];
  fixture.controlPaths = [];
  fixture.posts = [];
  fixture.beacons = [];
  fixture.live = null;
  state = { ...initialState, instances: [engine], config: { box: { configured: true } } as AppState["config"], computerControl: {} } as AppState;
  vi.stubGlobal("cry", {
    desktopViewer: { open: vi.fn(async () => true), close: vi.fn(async () => true), onState: () => () => {}, currentState: async () => ({ open: false, contextId: null }) },
  });
  vi.spyOn(window, "open").mockImplementation(() => null);
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    fixture.beacons.push({ url, body, keepalive: init?.keepalive === true });
    if (url === "/api/bots/scout/computer/control" && body.action === "release") {
      fixture.held = false;
      setTimeout(() => heldElsewhere(false), 0);
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  }));
});
afterEach(() => {
  root?.unmount();
  root = null;
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function pressEscape() {
  (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
}

describe("taking control of a Local VM", () => {
  it("turns the panel's own picture into the live desktop at once; no window or tab opens", async () => {
    await open(makeBot({ computer: "vm" }));
    await press("Take control");
    await shownLive();
    expect(liveDesktop()!.dataset.target).toBe(`local/bot-${"a".repeat(64)}`);
    expect(window.cry!.desktopViewer!.open, "nothing may open in another window").not.toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();
    expect(fixture.controls).toEqual([{ action: "take", controlLeaseId: expect.stringMatching(/^[0-9a-f]{36}$/), target: `local/bot-${"a".repeat(64)}` }]);
    expect(document.body.textContent).toContain("You're in control");
    expect(button("Hand control back")).toBeDefined();
  });

  it("hands back the hold it took with its own lease, at once, and returns to watching", async () => {
    await open(makeBot({ computer: "vm" }));
    await press("Take control");
    await press("Hand control back");
    expect(fixture.controls.at(-1)).toEqual({ action: "release", controlLeaseId: fixture.controls[0]!.controlLeaseId, target: `local/bot-${"a".repeat(64)}` });
    expect(liveDesktop()).toBeNull();
    expect(button("Take control")).toBeDefined();
  });

  it("hands back a hold another viewer has without a lease, naming the desktop it shows", async () => {
    fixture.held = true;
    fixture.owned = false;
    heldElsewhere(true);
    await open(makeBot({ computer: "vm" }));
    await press("Full screen");
    await shownLive();
    await press("Hand control back");
    expect(fixture.controls.at(-1)).toEqual({ action: "release", target: `local/bot-${"a".repeat(64)}` });
  });

  it("Full screen only watches: the bot keeps working until the person takes control from there", async () => {
    await open(makeBot({ computer: "vm" }));
    await press("Full screen");
    const watch = () => document.querySelector<HTMLElement>("[data-watch-full-screen]");
    expect(watch(), "Full screen must fill the window with the bot's screen").not.toBeNull();
    expect(watch()!.querySelector("img")!.getAttribute("src")).toBe("data:image/png;base64,FRAME");
    expect(fixture.controls, "watching must not pause the bot").toEqual([]);
    expect(liveDesktop()).toBeNull();

    const exit = watch()!.querySelector<HTMLButtonElement>("header button")!;
    expect(exit.getAttribute("aria-label"), "Exit keeps its name when its text is hidden on narrow windows").toBe("Exit fullscreen");

    // Something beneath the view that also listens for Escape (a turns call ends on it) must not get the same press.
    const beneath: string[] = [];
    const listen = (event: KeyboardEvent) => beneath.push(event.key);
    window.addEventListener("keydown", listen);
    try {
      pressEscape();
      await settle();
    } finally {
      window.removeEventListener("keydown", listen);
    }
    expect(watch(), "Escape leaves full screen").toBeNull();
    expect(beneath, "the Escape that closes full screen is not also handled beneath it").toEqual([]);
    expect(fixture.controls).toEqual([]);

    await press("Full screen");
    const take = [...watch()!.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Take control")!;
    flushSync(() => take.click());
    await settle();
    expect(fixture.controls.map((control) => control.action)).toEqual(["take"]);
    await shownLive();
    expect(liveDesktop()!.dataset.expanded, "taking control from full screen stays full screen").toBe("true");
    expect(watch()).toBeNull();
  });

  it("full screen shows only errors from a Take control tried there, and leaves Escape to a dialog opened over it", async () => {
    fixture.refuse = true;
    await open(makeBot({ computer: "vm" }));
    await press("Take control");
    expect(fixture.controls.map((control) => control.action)).toEqual(["take"]);
    await press("Full screen");
    const watch = () => document.querySelector<HTMLElement>("[data-watch-full-screen]");
    expect(watch()!.querySelector("[role=alert]"), "an earlier panel error is not news in full screen").toBeNull();

    const over = document.createElement("button");
    const overKeys = vi.fn();
    over.addEventListener("keydown", overKeys);
    document.body.append(over);
    over.focus();
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    over.dispatchEvent(escape);
    await settle();
    expect(overKeys, "the dialog over full screen gets its Escape").toHaveBeenCalledOnce();
    expect(escape.defaultPrevented).toBe(false);
    expect(watch(), "Escape in a dialog over full screen belongs to that dialog").not.toBeNull();
    over.remove();
  });

  it("a refused Take control in full screen keeps watching and says why", async () => {
    fixture.refuse = true;
    await open(makeBot({ computer: "vm" }));
    await press("Full screen");
    const watch = () => document.querySelector<HTMLElement>("[data-watch-full-screen]");
    const take = [...watch()!.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Take control")!;
    take.focus();
    flushSync(() => take.click());
    expect(take.disabled, "Take control waits while the request is out").toBe(true);
    expect(document.activeElement, "focus stays in full screen, not on a button that went disabled").toBe(watch());
    await settle();
    expect(fixture.controls.map((control) => control.action)).toEqual(["take"]);
    expect(watch(), "a failed take must not drop the person out of full screen").not.toBeNull();
    expect(watch()!.querySelector("[role=alert]")?.textContent).toBeTruthy();
    pressEscape();
    await settle();
    expect(watch(), "Escape still leaves full screen after a refused take").toBeNull();
  });

  it("full screen keeps Tab inside and gives focus back to Full screen when it closes", async () => {
    await open(makeBot({ computer: "vm" }));
    const trigger = button("Full screen")!;
    trigger.focus();
    await press("Full screen");
    const watch = document.querySelector<HTMLElement>("[data-watch-full-screen]")!;
    const [exit, take] = [...watch.querySelectorAll("button")];
    expect(document.activeElement).toBe(exit);
    exit!.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement, "Shift+Tab from Exit must stay in full screen").toBe(take);
    pressEscape();
    await settle();
    expect(document.querySelector("[data-watch-full-screen]")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closing the panel, leaving its Screen view or closing the page gives back the hold it took", async () => {
    await open(makeBot({ computer: "vm" }));
    await press("Take control");
    const lease = fixture.controls[0]!.controlLeaseId;
    root!.unmount();
    root = null;
    expect(releases(), "closing the panel left the bot waiting").toEqual([
      { url: "/api/bots/scout/computer/control", body: { action: "release", controlLeaseId: lease }, keepalive: true },
    ]);

    fixture.beacons = [];
    await open(makeBot({ computer: "vm" }));
    await press("Take control");
    await press("Browser");
    expect(releases(), "leaving the Screen view left the bot waiting").toHaveLength(1);

    fixture.beacons = [];
    await press("Screen");
    await press("Take control");
    window.dispatchEvent(new Event("pagehide"));
    await settle();
    expect(releases(), "closing the page left the bot waiting").toHaveLength(1);
    expect(liveDesktop()).toBeNull();
  });

  it("never gives back a hold another device has", async () => {
    fixture.held = true;
    fixture.owned = false;
    heldElsewhere(true);
    await open(makeBot({ computer: "vm" }));
    await press("Full screen");
    await shownLive();
    root!.unmount();
    root = null;
    expect(releases()).toEqual([]);
  });

  it("asks about and takes the conversation's own computer", async () => {
    await open(makeBot({ computer: "vm" }));
    await press("Take control");
    await press("Hand control back");
    expect(fixture.controlPaths).toHaveLength(3);
    expect(new Set(fixture.controlPaths)).toEqual(new Set(["/api/bots/scout/computer/control?threadId=thread"]));
  });

  it("says another viewer has paused the bots while a hold this panel did not take lasts, and still offers the hand-back", async () => {
    fixture.held = true;
    fixture.owned = false;
    heldElsewhere(true);
    await open(makeBot({ computer: "vm" }));
    expect(document.body.textContent).toContain("Another viewer has paused bot control on this desktop");
    expect(document.body.textContent).not.toContain("You're in control");
    expect(button("Hand control back")).toBeDefined();
  });

  it("a hand-back from elsewhere ends the live view once it lasts, and a flicker does not", async () => {
    await open(makeBot({ computer: "vm" }));
    await press("Take control");
    await shownLive();
    heldElsewhere(false);
    await new Promise((resolve) => setTimeout(resolve, 300));
    heldElsewhere(true);
    await new Promise((resolve) => setTimeout(resolve, 1_700));
    expect(liveDesktop(), "an out-of-order event ended the session").not.toBeNull();
    heldElsewhere(false);
    await new Promise((resolve) => setTimeout(resolve, 1_700));
    await settle();
    expect(liveDesktop()).toBeNull();
    expect(releases(), "it was not this panel's to give back").toEqual([]);
  });

  it("a desktop that never comes up gives the computer back and says so", async () => {
    await open(makeBot({ computer: "vm" }));
    await press("Take control");
    await shownLive();
    flushSync(() => fixture.live!.onUnreachable());
    await settle();
    expect(releases()).toHaveLength(1);
    expect(liveDesktop()).toBeNull();
    expect(document.body.textContent).toContain("Cry Bot couldn't open the live desktop. Try again.");
  });
});

describe("taking control of a self-hosted VPS", () => {
  it("is driven in place, and handing back closes its viewer tunnel", async () => {
    await open(makeBot({ computer: "cloud", cloudBackend: "vps" }));
    await press("Take control");
    await shownLive();
    expect(liveDesktop()!.dataset.target).toBe("vps/scout");
    expect(fixture.controls[0]).toMatchObject({ action: "take", target: "vps/scout" });
    expect(window.cry!.desktopViewer!.open).not.toHaveBeenCalled();
    await press("Hand control back");
    expect(fixture.beacons.some((beacon) => beacon.url.startsWith("/api/bots/scout/computer/viewer-close"))).toBe(true);
  });

  it("keeps a VPS takeover through a section refresh", async () => {
    await open(makeBot({ computer: "cloud", cloudBackend: "vps", section: "first" }));
    await press("Take control");
    await shownLive();
    fixture.beacons = [];
    shown = makeBot({ computer: "cloud", cloudBackend: "vps", section: "changed" });
    draw();
    await settle();
    expect(releases()).toEqual([]);
    expect(fixture.beacons.some((beacon) => beacon.url.endsWith("/computer/viewer-close"))).toBe(false);
    expect(liveDesktop()?.dataset.target).toBe("vps/scout");
  });
});


describe("shared screen takeover", () => {
  it("keeps the queue status node through a 409 and waits 15 seconds before retrying", async () => {
    vi.useFakeTimers();
    fixture.vm = { mode: "shared", target_key: "shared", screen: null, queue_position: 2 };
    await open(makeBot({ computer: "vm" }));
    const waiting = document.querySelector('[role="status"]');
    expect(waiting?.textContent).toContain("Queued · Position 2");
    expect(fixture.vmRequests).toHaveLength(1);

    fixture.vm = { unassigned: true };
    await vi.advanceTimersByTimeAsync(2_000);
    await settle();
    expect(fixture.vmRequests).toHaveLength(2);
    expect(document.querySelector('[role="status"]')).toBe(waiting);
    expect(waiting?.textContent?.trim()).toBe(t("vm.screens.unassignedBot"));
    expect(waiting?.textContent).not.toContain("Queued");
    expect(waiting?.textContent).not.toContain("Position 2");

    fixture.nextVmStatus = new Promise(() => {});
    await vi.advanceTimersByTimeAsync(14_900);
    await settle();
    expect(fixture.vmRequests).toHaveLength(2);
    expect(document.querySelector('[role="status"]')).toBe(waiting);
    await vi.advanceTimersByTimeAsync(99);
    await settle();
    expect(fixture.vmRequests).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    await settle();
    expect(fixture.vmRequests).toHaveLength(3);
    expect(document.querySelector('[role="status"]')).toBe(waiting);
    expect(waiting?.textContent).toContain("This bot has no screen assigned yet");
  });

  it("does not render the previous bot's screen or session target on the first render after switching bots", async () => {
    fixture.vm = { mode: "shared", target_key: "shared", screen: { screen: 2, viewerTarget: "local/shared-s2" } };
    await open(makeBot({ computer: "vm" }));
    await press("Take control");
    await shownLive();
    expect(liveDesktop()?.dataset.target).toBe("local/shared-s2");
    expect(fixture.takeoverRenders.at(-1)?.session).toContain(":local/shared-s2");

    fixture.nextVmStatus = new Promise(() => {});
    fixture.takeoverRenders = [];
    fixture.liveRenders = [];
    shown = makeBot({ id: "rover", name: "Rover", computer: "vm" });
    draw();
    expect(fixture.takeoverRenders[0]).toEqual({ botId: "rover", session: "rover:thread:vm:instabox:computer" });
    expect(fixture.liveRenders).toEqual([]);
    expect(liveDesktop()).toBeNull();
    await settle();
    expect(fixture.vmRequests).toContain("/api/bots/rover/local-computer?threadId=thread");
    expect(fixture.liveRenders).toEqual([]);
    expect(button("Take control")).toBeUndefined();
  });

  it("keeps a single screen takeover through a status refresh", async () => {
    fixture.vm = { mode: "shared", target_key: "shared", screen: { screen: 1, viewerTarget: "local/shared-s1" } };
    await open(makeBot({ computer: "vm", section: "first" }));
    await press("Take control");
    await shownLive();
    shown = makeBot({ computer: "vm", section: "changed" });
    draw();
    await settle();
    expect(releases()).toEqual([]);
    expect(liveDesktop()?.dataset.target).toBe("local/shared-s1");
  });

  it("keeps a per-bot single-screen takeover through a status refresh", async () => {
    fixture.vm = { mode: "per-bot", target_key: `bot:${"a".repeat(64)}` };
    await open(makeBot({ computer: "vm", section: "first" }));
    await press("Take control");
    await shownLive();
    shown = makeBot({ computer: "vm", section: "changed" });
    draw();
    await settle();
    expect(releases()).toEqual([]);
    expect(liveDesktop()?.dataset.target).toBe(`local/bot-${"a".repeat(64)}`);
  });

  it("keeps the waiting status node mounted while retrying an unassigned screen", async () => {
    fixture.vm = { mode: "shared", target_key: "shared", screen: null };
    await open(makeBot({ computer: "vm", section: "first" }));
    const waiting = [...document.querySelectorAll<HTMLElement>('[role="status"]')]
      .find((node) => node.textContent?.includes("This bot has no screen assigned yet"));
    expect(waiting).toBeDefined();
    shown = makeBot({ computer: "vm", section: "changed" });
    draw();
    await settle();
    expect(document.querySelector('[role="status"]')).toBe(waiting);
  });

  it.each([1, 2, 3, 4])("takes only the bot's assigned screen %s, including without a legacy viewer URL", async (screen) => {
    fixture.vm = { mode: "shared", target_key: "shared", viewer_url: "", screen: { screen, viewerTarget: `local/shared-s${screen}` } };
    await open(makeBot({ computer: "vm" }));
    await press("Take control");
    await shownLive();
    expect(liveDesktop()!.dataset.target).toBe(`local/shared-s${screen}`);
    expect(fixture.controls[0]).toMatchObject({ action: "take", target: `local/shared-s${screen}` });
    await press("Hand control back");
    expect(fixture.controls.at(-1)).toMatchObject({ action: "release", target: `local/shared-s${screen}` });
  });

  it("keeps the single-screen target when the server omits screen assignment", async () => {
    fixture.vm = { mode: "shared", target_key: "shared" };
    await open(makeBot({ computer: "vm" }));
    await press("Take control");
    await shownLive();
    expect(liveDesktop()!.dataset.target).toBe("local/shared");
  });

  it.each([undefined, 2])("never takes the shared container while unassigned or queued: %s", async (position) => {
    fixture.vm = { mode: "shared", target_key: "shared", screen: null, queue_position: position };
    await open(makeBot({ computer: "vm" }));
    expect(document.body.textContent).toContain(position ? "Queued · Position 2" : "This bot has no screen assigned yet");
    expect(document.body.textContent).not.toContain("Open Settings");
    expect(button("Take control")).toBeUndefined();
    expect(fixture.controls).toEqual([]);
    expect(liveDesktop()).toBeNull();
  });

  it("automatically opens the assigned screen after leaving the queue", async () => {
    fixture.vm = { mode: "shared", target_key: "shared", screen: null, queue_position: 1 };
    await open(makeBot({ computer: "vm" }));
    fixture.vm = { mode: "shared", target_key: "shared", screen: { screen: 3, viewerTarget: "local/shared-s3" } };
    await vi.waitFor(() => expect(button("Take control")).toBeDefined(), { timeout: 4000 });
    await press("Take control");
    await shownLive();
    expect(liveDesktop()!.dataset.target).toBe("local/shared-s3");
  });
});


it("treats a screen_not_assigned conflict as waiting and automatically retries", async () => {
  fixture.vm = { unassigned: true };
  await open(makeBot({ computer: "vm" }));
  expect(document.body.textContent).toContain("This bot has no screen assigned yet");
  expect(document.body.textContent).not.toContain("screen_not_assigned");
  expect(fixture.controls).toEqual([]);
  fixture.vm = { mode: "shared", screen: { screen: 4, viewerTarget: "local/shared-s4" } };
  await vi.waitFor(() => expect(button("Take control")).toBeDefined(), { timeout: 17_000 });
  await press("Take control");
  await shownLive();
  expect(liveDesktop()!.dataset.target).toBe("local/shared-s4");
});

it.each([false, true])("assigns from the main panel and automatically takes control (queued=%s)", async queued => {
  fixture.vm = { unassigned: true };
  const ready = { mode: "shared", ready: true, screen: { screen: 3, viewerTarget: "local/shared-s3" } };
  fixture.assignment = queued ? { screen: null, queue_position: 2 } : ready;
  fixture.assignPaths = [];
  await open(makeBot({ computer: "vm" }));
  await press("Assign a screen now");
  expect(fixture.assignPaths[0]).toContain("/local-computer/assign-screen?threadId=");
  if (queued) {
    expect(document.body.textContent).toContain("Queued · Position 2");
    expect(fixture.controls).toEqual([]);
    fixture.vm = ready;
  }
  await vi.waitFor(() => expect(liveDesktop()?.dataset.target).toBe("local/shared-s3"), { timeout: 5000 });
  expect(fixture.assignPaths).toHaveLength(1);
});


it.each([false, true])("keeps assignment visible while starting, then opens or retries a failure (fail=%s)", async fail => {
  vi.useFakeTimers();
  fixture.vm = { unassigned: true };
  fixture.assignment = { screen: null, queue_position: 2 };
  fixture.assignPaths = [];
  await open(makeBot({ computer: "vm" }));
  await press("Assign a screen now");
  expect(document.body.textContent).toContain("Queued · Position 2");
  const ready = { mode: "shared", ready: true, desktopReady: true, screen: { screen: 3, viewerTarget: "local/shared-s3" } };
  fixture.vm = { ...ready, ready: false };
  await vi.advanceTimersByTimeAsync(20_000);
  await settle();
  expect(document.querySelector('[role="status"]')?.textContent).toContain(t("settings.updates.opening"));
  expect(button(t("settings.updates.opening"))?.disabled).toBe(true);
  expect(fixture.vmForegroundRequests).toBeGreaterThanOrEqual(3);
  expect(liveDesktop()).toBeNull();
  if (fail) {
    fixture.vm = { statusError: "Screen startup failed" };
    await vi.advanceTimersByTimeAsync(4000);
    await settle();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("Screen startup failed");
    expect(button("Retry")?.disabled).toBe(false);
    fixture.assignment = ready;
    await press("Retry");
    expect(fixture.assignPaths).toHaveLength(2);
  } else {
    fixture.vm = ready;
    await vi.advanceTimersByTimeAsync(2000);
    await settle();
  }
  expect(liveDesktop()?.dataset.target).toBe("local/shared-s3");
  expect(document.querySelector('[role="status"]')).toBeNull();
  expect(button(t("settings.updates.opening"))).toBeUndefined();
});


it("keeps a failed desktop opening retryable after the screen becomes ready", async () => {
  vi.useFakeTimers();
  fixture.vm = { unassigned: true };
  fixture.assignment = { ready: true, screen: { screen: 3, viewerTarget: "local/shared-s3" } };
  fixture.refuse = true;
  await open(makeBot({ computer: "vm" }));
  await press("Assign a screen now");
  expect(liveDesktop()).toBeNull();
  expect(document.querySelector('[role="alert"]')?.textContent).toBe(t("computer.err.confirmControl"));
  expect(button("Retry")?.disabled).toBe(false);
  fixture.refuse = false;
  await press("Retry");
  expect(liveDesktop()?.dataset.target).toBe("local/shared-s3");
  expect(document.querySelector('[role="alert"]')).toBeNull();
});

it.each(["unassigned", "error", "unavailable", "missing-target"])("makes an assigned screen retryable when the next status is %s", async outcome => {
  vi.useFakeTimers();
  fixture.vm = { unassigned: true };
  fixture.assignment = { ready: true, screen: { screen: 3, viewerTarget: "local/shared-s3" } };
  await open(makeBot({ computer: "vm" }));
  let resolveStatus!: (status: Record<string, unknown>) => void;
  let rejectStatus!: (cause: Error) => void;
  fixture.nextVmStatus = new Promise((resolve, reject) => { resolveStatus = resolve; rejectStatus = reject; });
  await press("Assign a screen now");
  expect(fixture.assignedOpen).not.toBeNull();
  expect(button(t("settings.updates.opening"))?.disabled).toBe(true);
  if (outcome === "unassigned") rejectStatus(new ApiError("screen_not_assigned", 409, { error: "screen_not_assigned" }));
  else if (outcome === "error") rejectStatus(new Error("Screen startup failed"));
  else resolveStatus(outcome === "unavailable" ? { ready: false, problem: "Screen startup failed" } : { ready: true });
  await settle();
  const message = outcome === "unassigned" ? "screen_not_assigned" : outcome === "missing-target" ? t("computer.err.screenUnavailable") : "Screen startup failed";
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(message);
  expect(button(t("settings.updates.opening"))).toBeUndefined();
  const retry = document.querySelector('[role="alert"]')!.parentElement!.querySelector("button")!;
  expect(retry.textContent).toBe(t("chat.retry"));
  expect(retry.disabled).toBe(false);
  expect(liveDesktop()).toBeNull();
  fixture.nextVmStatus = null;
  flushSync(() => retry.click());
  await settle();
  expect(liveDesktop()?.dataset.target).toBe("local/shared-s3");
  expect(document.querySelector('[role="alert"]')).toBeNull();
});

it.each([
  ["unmount", false], ["bot", false], ["thread", false],
  ["unmount", true], ["bot", true], ["thread", true],
] as const)("rejects the pending assigned-screen opening on %s (taking=%s)", async (change, taking) => {
  vi.useFakeTimers();
  fixture.vm = { unassigned: true };
  fixture.assignment = { ready: true, screen: { screen: 3, viewerTarget: "local/shared-s3" } };
  await open(makeBot({ computer: "vm" }));
  let resolveStatus!: (status: Record<string, unknown>) => void;
  let resolveTake!: () => void;
  if (taking) fixture.nextTake = new Promise(resolve => { resolveTake = resolve; });
  else fixture.nextVmStatus = new Promise(resolve => { resolveStatus = resolve; });
  await press("Assign a screen now");
  expect(fixture.assignedOpen).not.toBeNull();
  const resolved = vi.fn(), rejected = vi.fn();
  void fixture.assignedOpen!.then(resolved, rejected);
  if (change === "unmount") {
    flushSync(() => root!.unmount());
    root = null;
  } else {
    shown = change === "bot" ? makeBot({ id: "rover", computer: "vm" }) : makeBot({ threadId: "next", computer: "vm" });
    draw();
  }
  await settle();
  expect(rejected).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: "AbortError" }));
  if (taking) resolveTake();
  else resolveStatus(fixture.assignment!);
  await settle();
  expect(resolved).not.toHaveBeenCalled();
  expect(fixture.controls).toHaveLength(taking ? 1 : 0);
});
