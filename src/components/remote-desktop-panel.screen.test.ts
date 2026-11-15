// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setLocale } from "@/lib/i18n";
import type { Bot } from "@/state/store";

const fixture = vi.hoisted(() => ({ status: vi.fn(), assign: vi.fn(), openDesktop: vi.fn() }));
vi.mock("./computer-takeover", () => ({ openProviderDesktop: fixture.openDesktop }));
vi.mock("./DesktopCapabilities", () => ({ useCaptionChrome: () => ({ dragProps: {} }) }));
vi.mock("@/lib/page-visible", () => ({ usePageVisible: () => false }));
vi.mock("./BrowserPanel", () => ({ BrowserPanel: () => null }));
vi.mock("./RoutinesPage", () => ({ RoutineEditor: () => null }));
vi.mock("@/state/store", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/state/store")>(),
  api: (path: string, init?: RequestInit & { background?: boolean }) => {
    if (path === "/api/bots/scout/local-computer/assign-screen") return fixture.assign(init);
    if (path === "/api/bots/scout/local-computer") return fixture.status(init);
    if (path === "/api/bots/scout/computer/viewer-close") return Promise.resolve({});
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
  fixture.assign.mockReset();
  fixture.openDesktop.mockReset().mockResolvedValue(undefined);
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

const assign = async () => {
  const button = [...host.querySelectorAll("button")].find(node => node.textContent === "现在分配屏幕");
  expect(button).toBeDefined();
  await act(async () => button!.click());
};
const assignedStatus = { ready: true, screen: { screen: 2, viewerTarget: "local/shared-s2" } };
const viewer = () => vi.stubGlobal("cry", { desktopViewer: { currentState: async () => ({ open: false }), onState: () => () => {} } });

it("assigns an idle bot a screen and continues the existing desktop open flow", async () => {
  viewer();
  await open();
  expect(host.textContent).toContain("这个智能体目前没有分配屏幕。");
  fixture.assign.mockImplementation(async () => { fixture.status.mockResolvedValue(assignedStatus); return assignedStatus; });
  await assign();
  expect(fixture.assign).toHaveBeenCalledWith(expect.objectContaining({ method: "POST", body: "{}" }));
  expect(fixture.openDesktop).toHaveBeenCalledOnce();
  expect(fixture.openDesktop).toHaveBeenCalledWith(expect.objectContaining({ botId: "scout" }));
  expect(host.textContent).toContain("第 2 块屏");
});

it("shows the queue position, waits for readiness, and opens automatically", async () => {
  viewer();
  await open();
  fixture.assign.mockResolvedValue({ screen: null, queue_position: 2 });
  fixture.status.mockResolvedValue({ screen: null, queue_position: 2 });
  await assign();
  expect(host.textContent).toContain("正在排队，第 2 位");
  expect(fixture.openDesktop).not.toHaveBeenCalled();
  fixture.status.mockResolvedValue({ ...assignedStatus, ready: false });
  await advance(2000);
  expect(fixture.openDesktop).not.toHaveBeenCalled();
  fixture.status.mockResolvedValue(assignedStatus);
  await advance(2000);
  expect(fixture.openDesktop).toHaveBeenCalledOnce();
  await advance(8000);
  expect(fixture.openDesktop).toHaveBeenCalledOnce();
});

it("shows assignment failures and lets the user retry", async () => {
  await open();
  fixture.assign.mockRejectedValue(new Error("Assignment unavailable"));
  await assign();
  expect(host.textContent).toContain("Assignment unavailable");
  expect([...host.querySelectorAll("button")].find(node => node.textContent === "重试")?.disabled).toBe(false);
});

it("never opens a desktop after the panel closes during an assignment", async () => {
  viewer();
  await open();
  let resolve!: (value: unknown) => void;
  fixture.assign.mockImplementation(() => new Promise(done => { resolve = done; }));
  await assign();
  const signal = fixture.assign.mock.calls[0][0].signal as AbortSignal;
  act(() => root!.unmount()); root = null;
  await act(async () => resolve(assignedStatus));
  expect(signal.aborted).toBe(true);
  expect(fixture.openDesktop).not.toHaveBeenCalled();
});


it.each([false, true])("keeps polling and showing assignment while the screen starts, including failure and retry (fail=%s)", async fail => {
  viewer();
  await open();
  fixture.assign.mockResolvedValue({ screen: null, queue_position: 2 });
  await assign();
  expect(host.textContent).toContain("正在排队，第 2 位");
  fixture.status.mockResolvedValue({ ...assignedStatus, ready: false, desktopReady: true });
  await advance(8000);
  expect(host.querySelector('[role="status"]')?.textContent).toContain("正在打开");
  expect(fixture.status).toHaveBeenCalledTimes(7);
  expect(fixture.openDesktop).not.toHaveBeenCalled();
  if (fail) {
    fixture.status.mockRejectedValue(new Error("Screen startup failed"));
    await advance(4000);
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("Screen startup failed");
    const retry = [...host.querySelectorAll("button")].find(node => node.textContent === "重试");
    expect(retry?.disabled).toBe(false);
    fixture.status.mockResolvedValue(assignedStatus);
    fixture.assign.mockResolvedValue(assignedStatus);
    await act(async () => retry!.click());
    expect(fixture.assign).toHaveBeenCalledTimes(2);
  } else {
    fixture.status.mockResolvedValue(assignedStatus);
    await advance(2000);
  }
  expect(fixture.openDesktop).toHaveBeenCalledOnce();
  expect(host.querySelector('[role="status"]')).toBeNull();
  expect(host.querySelector('[role="alert"]')).toBeNull();
});

it("keeps the assignment visible until the viewer opens and offers retry when opening fails", async () => {
  viewer();
  await open();
  let rejectOpen!: (cause: Error) => void;
  fixture.openDesktop.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOpen = reject; }));
  fixture.status.mockResolvedValue(assignedStatus);
  fixture.assign.mockResolvedValue(assignedStatus);
  await assign();
  await advance(4000);
  expect(host.querySelector('[role="status"]')?.textContent).toContain("正在打开");
  await act(async () => rejectOpen(new Error("Viewer failed")));
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Viewer failed");
  const retry = [...host.querySelectorAll("button")].find(node => node.textContent === "重试");
  expect(retry?.disabled).toBe(false);
  await act(async () => retry!.click());
  expect(fixture.openDesktop).toHaveBeenCalledTimes(2);
  expect(host.querySelector('[role="status"]')).toBeNull();
});
