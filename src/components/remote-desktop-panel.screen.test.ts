// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setLocale } from "@/lib/i18n";
import type { Bot } from "@/state/store";

const fixture = vi.hoisted(() => ({ status: vi.fn() }));
vi.mock("./DesktopCapabilities", () => ({ useCaptionChrome: () => ({ dragProps: {} }) }));
vi.mock("@/lib/page-visible", () => ({ usePageVisible: () => false }));
vi.mock("./BrowserPanel", () => ({ BrowserPanel: () => null }));
vi.mock("./RoutinesPage", () => ({ RoutineEditor: () => null }));
vi.mock("@/state/store", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/state/store")>(),
  api: (path: string, init?: RequestInit & { background?: boolean }) => {
    if (path === "/api/bots/scout/local-computer") return fixture.status(init);
    throw new Error(`Unexpected request: ${path}`);
  },
}));

const { RemoteDesktopPanel } = await import("./remote-desktop-panel");
const { ApiError, BotEditorStore, initialState } = await import("@/state/store");
const bot = {
  id: "scout", name: "Scout", busy: true, computer: "vm",
  modelSelection: { instanceId: "claude", model: "m" },
} as Bot;
let root: Root | null;
let host: HTMLDivElement;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("cry", undefined);
  setLocale("zh");
  fixture.status.mockReset().mockRejectedValue(new ApiError("screen_not_assigned", 409, { error: "screen_not_assigned" }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  host.remove();
  setLocale("en");
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const open = () => act(async () => root!.render(createElement(BotEditorStore, { value: {
  state: initialState,
  dispatch: vi.fn(), flushBotPatches: async () => null, refreshInstances: async () => {}, refreshModels: async () => {},
}, children: createElement(RemoteDesktopPanel, { bot }) })));
const advance = (milliseconds: number) => act(async () => vi.advanceTimersByTimeAsync(milliseconds));

it("updates the subtitle after a queued bot gets screen 2 while busy stays true, then stops polling", async () => {
  await open();
  expect(host.textContent).toContain("私有桌面");
  expect(fixture.status).toHaveBeenCalledTimes(1);
  expect(fixture.status.mock.calls[0][0].background).not.toBe(true);
  await advance(4000);
  expect(fixture.status).toHaveBeenCalledTimes(2);
  expect(host.textContent).toContain("私有桌面");

  fixture.status.mockResolvedValue({ screen: { screen: 2 } });
  await advance(3999);
  expect(fixture.status).toHaveBeenCalledTimes(2);
  await advance(1);
  expect(host.textContent).toContain("第 2 块屏");
  expect(host.textContent).not.toContain("私有桌面");
  expect(bot.busy).toBe(true);
  await advance(12_000);
  expect(fixture.status).toHaveBeenCalledTimes(3);
  for (const [init] of fixture.status.mock.calls.slice(1)) expect(init.background).toBe(true);
});

it("does not poll after a successful single-screen response without a screen number", async () => {
  fixture.status.mockResolvedValue({ running: true });
  await open();
  expect(host.textContent).toContain("私有桌面");
  await advance(12_000);
  expect(fixture.status).toHaveBeenCalledTimes(1);
});

it("stops pending polling when the panel closes", async () => {
  await open();
  const signal = fixture.status.mock.calls[0][0].signal as AbortSignal;
  act(() => root!.unmount());
  root = null;
  expect(signal.aborted).toBe(true);
  await advance(12_000);
  expect(fixture.status).toHaveBeenCalledTimes(1);
});

it("does not overlap a slow status request or restart polling after closing during it", async () => {
  let resolveStatus!: (status: { screen: null }) => void;
  fixture.status.mockImplementation(() => new Promise(resolve => { resolveStatus = resolve; }));
  await open();
  await advance(12_000);
  expect(fixture.status).toHaveBeenCalledTimes(1);
  act(() => root!.unmount());
  root = null;
  await act(async () => resolveStatus({ screen: null }));
  await advance(12_000);
  expect(fixture.status).toHaveBeenCalledTimes(1);
});

it.each([
  new Error("Status unavailable"),
  new ApiError("conflict", 409, { error: "conflict" }),
  new ApiError("screen_not_assigned", 503, { error: "screen_not_assigned" }),
])("stops polling after an unrelated failure: %s", async (cause) => {
  fixture.status.mockRejectedValueOnce(cause);
  await open();
  fixture.status.mockResolvedValue({ screen: { screen: 2 } });
  await advance(12_000);
  expect(host.textContent).toContain("私有桌面");
  expect(fixture.status).toHaveBeenCalledTimes(1);
});
