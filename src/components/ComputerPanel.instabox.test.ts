// @vitest-environment happy-dom
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import type { AppState, Bot, InstanceInfo } from "@/state/store";

const fixture = vi.hoisted(() => ({ configured: false, reads: 0 }));
vi.mock("./DesktopCapabilities", async original => ({
  ...await original<typeof import("./DesktopCapabilities")>(),
  useCaptionChrome: () => ({ padClass: undefined }),
  useDesktopCapabilities: () => ({ ready: true, capabilities: {
    host: { platform: "linux", label: "Fixture", session: "unknown", packaged: false, homeDir: "/tmp" },
    windowChrome: "native", screenPreview: { available: false, interaction: "none" },
    dictation: { available: false, engine: "none", onDevice: false },
    localComputer: { available: false, support: "unsupported", enabled: false, status: "unavailable" },
  } }),
}));
vi.mock("@/lib/interface-mode", () => ({ useAdvancedMode: () => true, setAdvancedMode: () => {} }));
vi.mock("./AndroidDevicePanel", () => ({ AndroidDevicePanel: () => null, useAndroidUsbDevices: () => ({ devices: [] }) }));
vi.mock("./BrowserPanel", () => ({ BrowserPanel: () => null }));
vi.mock("./InstaboxSnapshots", () => ({ InstaboxSnapshots: () => null }));
vi.mock("./bot-settings/RoutinesSection", () => ({ RoutinesSection: () => null }));
vi.mock("@/state/store", async original => ({
  ...await original<typeof import("@/state/store")>(),
  api: async (path: string) => {
    if (path.startsWith("/api/bots/fixture-bot/computer?")) {
      fixture.reads++;
      return { backend: "instabox", configured: fixture.configured, ready: false, machine: null };
    }
    if (path.includes("computer/control")) return { held: false, helpReason: null };
    return {};
  },
}));
const { ComputerPanel } = await import("./ComputerPanel");
const { BotEditorStore, initialState } = await import("@/state/store");

it.each([undefined, "instabox"] as const)("uses InstaBox and refreshes its key for backend %s", async (cloudBackend) => {
  fixture.configured = false; fixture.reads = 0;
  const bot = { id: "fixture-bot", threadId: "fixture-thread", name: "Fixture", title: "", description: "", color: "green",
    computer: "cloud", cloudBackend, modelSelection: { instanceId: "fixture", model: "fixture" },
    messages: [], tasks: [], busy: false } as unknown as Bot;
  const instance = { instanceId: "fixture", driverKind: "claudeAgent", displayName: "Fixture", access: "subscription",
    snapshot: { state: "available", authenticated: true }, capabilities: { computerMcp: true, browserMcp: true },
    models: { default: "fixture", options: [{ id: "fixture", label: "Fixture" }] } } as InstanceInfo;
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { headers: { "content-type": "application/json" } })));
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  const render = () => {
    const state = { ...initialState, bots: [bot], selectedId: bot.id, instances: [instance],
      config: { box: { configured: false }, vps: { configured: false }, instabox: { configured: fixture.configured, fromEnv: false } } } as AppState;
    flushSync(() => root.render(createElement(BotEditorStore, { value: { state, dispatch: vi.fn(), flushBotPatches: async () => null,
      refreshInstances: async () => {}, refreshModels: async () => {} }, children: createElement(ComputerPanel, { bot }) })));
  };
  try {
    render();
    await vi.waitFor(() => expect(fixture.reads).toBeGreaterThan(0));
    await vi.waitFor(() => expect(host.textContent).toContain("Add your InstaBox key in Settings first"));
    const reads = fixture.reads;
    fixture.configured = true;
    render();
    await vi.waitFor(() => expect(fixture.reads).toBeGreaterThan(reads));
    await vi.waitFor(() => expect(host.textContent).not.toContain("Add your InstaBox key in Settings first"));
    expect(host.textContent).not.toContain("Connect Boat");
  } finally { root.unmount(); host.remove(); vi.unstubAllGlobals(); }
});
