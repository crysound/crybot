// @vitest-environment happy-dom
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState, Bot, InstanceInfo } from "@/state/store";
import { setLocale, t } from "@/lib/i18n";

const fixture = vi.hoisted(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { headers: { "content-type": "application/json" } })));
  return { api: vi.fn<(...args: unknown[]) => Promise<object>>(async () => ({})) };
});
vi.mock("./DesktopCapabilities", () => ({
  useCaptionChrome: () => ({ padClass: undefined }),
  useDesktopCapabilities: () => ({ ready: true, capabilities: {
    host: { platform: "linux", label: "Host", session: "unknown", packaged: false },
    localComputer: { available: false, support: "unsupported", enabled: false, status: "unavailable" },
    screenPreview: { available: false, interaction: "none" },
    dictation: { available: false, engine: "none", onDevice: false },
  } }),
}));
vi.mock("@/lib/interface-mode", () => ({ useAdvancedMode: () => true, setAdvancedMode: () => {} }));
vi.mock("./AndroidDevicePanel", () => ({ AndroidDevicePanel: () => null, useAndroidUsbDevices: () => ({ devices: [] }) }));
vi.mock("./BrowserPanel", () => ({ BrowserPanel: () => null }));
vi.mock("./CloudBackendPicker", () => ({ CloudBackendPicker: () => null }));
vi.mock("./bot-settings/RoutinesSection", () => ({
  RoutinesSection: ({ defaultRunOn }: { defaultRunOn: string }) => createElement("div", { "data-run-on": defaultRunOn }),
}));
vi.mock("@/state/store", async (original) => ({
  ...await original<typeof import("@/state/store")>(),
  api: (...args: unknown[]) => fixture.api(...args),
}));

const { ComputerPanel } = await import("./ComputerPanel");
const { BotEditorStore, initialState } = await import("@/state/store");
const bot = {
  id: "bot", threadId: "thread", name: "Fixture", title: "", description: "", color: "green",
  notifications: true, unread: false, computer: "vm", messages: [],
  modelSelection: { instanceId: "claude", model: "m" },
} as Bot;
let root: Root;
let container: HTMLDivElement;
let value: Parameters<typeof BotEditorStore>[0]["value"];
let engine: InstanceInfo;
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0)); };
async function render() {
  value = { ...value, state: { ...value.state, instances: [engine] } };
  flushSync(() => root.render(createElement(BotEditorStore, { value, children: createElement(ComputerPanel, { bot }) })));
  await settle();
}

beforeEach(() => {
  setLocale("en");
  localStorage.clear();
  fixture.api.mockClear();
  engine = {
    instanceId: "claude", driverKind: "claudeAgent", displayName: "Claude", access: "subscription",
    snapshot: { state: "available", version: "1", authenticated: true },
    models: { default: "m", options: [{ id: "m", label: "M" }] },
    capabilities: { computerMcp: true, browserMcp: true },
  } as InstanceInfo;
  const state: AppState = { ...initialState, bots: [bot], selectedId: bot.id, config: { box: { configured: true } } as AppState["config"] };
  value = { state, dispatch: vi.fn(), flushBotPatches: async () => null, refreshInstances: async () => {}, refreshModels: async () => {} };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterAll(() => vi.unstubAllGlobals());
afterEach(() => {
  root.unmount();
  container.remove();
  setLocale("en");
});

describe.each(["en", "zh"])("private desktop engine messages (%s)", (locale) => {
  it.each([".", "。", ".。", "... ", "。 .\n"])("removes trailing punctuation from the engine reason (%j)", async (ending) => {
    setLocale(locale);
    engine.snapshot = { state: "unavailable", reason: `CLI blocked by isolation${ending}` };
    await render();
    expect(container.textContent).toContain(locale === "en"
      ? "Engine currently unavailable: CLI blocked by isolation. Check the engine in Settings."
      : "引擎当前不可用：CLI blocked by isolation。请前往设置检查引擎。");
    expect(container.textContent).not.toMatch(/[.。]{2}/);
  });

  it("names unsupported capability without calling the engine unavailable", async () => {
    setLocale(locale);
    engine.capabilities!.computerMcp = false;
    await render();
    expect(container.textContent).toContain(t("computer.err.vmEngine"));
    expect(container.textContent).not.toContain(t("computer.checkEngineSettings"));
    expect(fixture.api).not.toHaveBeenCalledWith(expect.stringContaining("local-computer"));
  });

  it("shows the unavailable reason and opens engine settings", async () => {
    setLocale(locale);
    engine.snapshot = { state: "unavailable", reason: "CLI blocked by isolation" };
    await render();
    expect(container.textContent).toContain(t("computer.err.engineUnavailable", { problem: engine.snapshot.reason! }));
    expect(container.textContent).not.toContain(t("computer.err.vmEngine"));
    const button = [...container.querySelectorAll("button")].find((item) => item.textContent === t("computer.checkEngineSettings"));
    expect(button).toBeDefined();
    button!.click();
    expect(value.dispatch).toHaveBeenCalledWith({ type: "toggleAppSettings", open: true, section: "engines" });
    expect(fixture.api).not.toHaveBeenCalledWith(expect.stringContaining("local-computer"));
  });
});

it("refreshes the reason and resumes the VM check when the engine recovers", async () => {
  engine.snapshot = { state: "unavailable" };
  await render();
  expect(container.textContent).toContain(t("computer.err.engineUnknown"));
  engine = { ...engine, snapshot: { state: "unavailable", reason: "New reason" } };
  await render();
  expect(container.textContent).toContain("New reason");
  setLocale("zh");
  await render();
  expect(container.textContent).toContain(t("computer.err.engineUnavailable", { problem: "New reason" }));
  engine = { ...engine, snapshot: { state: "available", version: "1" } };
  await render();
  expect(container.textContent).not.toContain("New reason");
  expect(fixture.api).toHaveBeenCalledWith(expect.stringContaining("local-computer"));
});

it.each([
  [true, "available", "cloud"],
  [true, "unavailable", "bot"],
  [false, "available", "bot"],
] as const)("defaults routines with capability %s and state %s to %s", async (capable, state, expected) => {
  engine.capabilities!.computerMcp = capable;
  engine.snapshot = { state };
  await render();
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent?.startsWith("Routines"));
  expect(button).toBeDefined();
  flushSync(() => button!.click());
  expect(container.querySelector("[data-run-on]")?.getAttribute("data-run-on")).toBe(expected);
});
