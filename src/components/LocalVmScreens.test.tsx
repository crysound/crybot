// @vitest-environment happy-dom
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setLocale } from "@/lib/i18n";
import { LocalVmScreens, type ScreenListPayload } from "./LocalVmScreens";

const fixture = vi.hoisted(() => ({ requests: [] as Array<{ path: string; body: Record<string, unknown> }>, refuse: false, waitForTake: null as Promise<void> | null }));
vi.mock("@/state/store", () => ({
  api: async (path: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    fixture.requests.push({ path, body });
    if (body.action === "take") await fixture.waitForTake;
    if (path.endsWith("/control")) return { held: body.action === "take" && !fixture.refuse, owned: true, helpReason: null };
    return { image: "data:image/png;base64,AAAA" };
  },
}));
vi.mock("./LiveDesktop", () => ({ LiveDesktop: ({ target }: { target: string }) => <div data-live-target={target} /> }));

const payload = (): ScreenListPayload => ({
  layout: "multi", screens: 4,
  slots: [1, 2, 3, 4].map((screen) => ({
    screen, state: "ready", bot: { id: `bot-${screen}`, name: `Agent ${screen}` },
    viewerTarget: `local/shared-s${screen}`, controlledByPerson: screen === 3, idleSeconds: screen === 1 ? null : screen * 10,
  })),
  queue: [{ bot: { id: "bot-5", name: "Agent 5" }, position: 1, waitingSeconds: 25 }],
});
let root: Root;
function render(data = payload()) {
  flushSync(() => root.render(createElement(LocalVmScreens, { payload: data })));
}
async function press(text: string) {
  const button = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes(text) || button.getAttribute("aria-label") === text);
  expect(button, document.body.textContent ?? "").toBeDefined();
  flushSync(() => button!.click());
  await vi.waitFor(() => expect(document.querySelector("[role=alert]")).toBeNull());
}
beforeEach(() => {
  setLocale("en");
  fixture.requests = [];
  fixture.refuse = false;
  fixture.waitForTake = null;
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  flushSync(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

it("keeps the single-screen layout unchanged without fetching a screen", () => {
  render({ ...payload(), layout: "single" });
  expect(document.body.textContent).toBe("");
  expect(fixture.requests).toEqual([]);
});

it("shows all screens, owners, idle time, person control and the ordered queue", () => {
  render();
  expect(document.querySelectorAll("button[aria-pressed]")).toHaveLength(4);
  expect(document.body.textContent).toContain("Agent 4");
  expect(document.body.textContent).toContain("Idle for 40s");
  expect(document.body.textContent).toContain("Controlled by a person");
  expect(document.querySelector("ol")?.textContent).toContain("Agent 5Queued · Position 1Waiting for 25s");
});

it("shows idle and queue durations in minutes after one minute", () => {
  const data = payload();
  data.slots[0]!.idleSeconds = 420;
  data.queue[0]!.waitingSeconds = 125;
  render(data);
  expect(document.body.textContent).toContain("Idle for 7 minutes");
  expect(document.body.textContent).toContain("Waiting for 2 minutes");
});

it("switches the watched screen without taking it, then takes and hands back only that screen", async () => {
  render();
  await press("Watch screen 2");
  await vi.waitFor(() => expect(fixture.requests.some(({ path }) => path === "/api/local-computer/screens/2/screenshot")).toBe(true));
  expect(fixture.requests.filter(({ path }) => path.endsWith("/control"))).toEqual([]);
  await press("Take control of this screen");
  await vi.waitFor(() => expect(document.querySelector("[data-live-target]")?.getAttribute("data-live-target")).toBe("local/shared-s2"));
  const take = fixture.requests.find(({ body }) => body.action === "take")!;
  expect(take).toEqual({ path: "/api/bots/bot-2/computer/control", body: { action: "take", target: "local/shared-s2", controlLeaseId: expect.any(String) } });
  await press("Hand control back");
  expect(fixture.requests.find(({ body }) => body.action === "release")).toEqual({ path: take.path, body: { ...take.body, action: "release" } });
});

it("releases its lease when switching screens", async () => {
  render();
  await press("Take control of this screen");
  await vi.waitFor(() => expect(document.querySelector("[data-live-target]")).not.toBeNull());
  await press("Watch screen 4");
  expect(document.querySelector("[data-live-target]")).toBeNull();
  expect(fetch).toHaveBeenCalledWith("/api/bots/bot-1/computer/control", expect.objectContaining({
    keepalive: true, body: JSON.stringify({ action: "release", controlLeaseId: fixture.requests.find(({ body }) => body.action === "take")!.body.controlLeaseId }),
  }));
});

it.each(["off", "starting", "stopping", "failed"] as const)("does not view or take a %s screen", (state) => {
  const data = payload();
  data.slots = [{ ...data.slots[0]!, state }];
  render(data);
  expect([...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Take control"))?.disabled).toBe(true);
  expect(fixture.requests).toEqual([]);
});

it("disables takeover of an unassigned screen and renders Chinese queue copy", () => {
  setLocale("zh");
  const data = payload();
  data.slots = [{ ...data.slots[0]!, bot: null }];
  render(data);
  expect([...document.querySelectorAll("button")].find((button) => button.textContent?.includes("接管这块屏"))?.disabled).toBe(true);
  expect(document.body.textContent).toContain("正在排队，第 1 位");
  setLocale("en");
});

it("keeps a refused takeover out of the live desktop and reports the failure", async () => {
  fixture.refuse = true;
  render();
  const button = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Take control"))!;
  flushSync(() => button.click());
  await vi.waitFor(() => expect(document.querySelector("[role=alert]")?.textContent).toBeTruthy());
  expect(document.querySelector("[data-live-target]")).toBeNull();
});


it("releases a delayed take on the original screen after the person switches away", async () => {
  let finish!: () => void;
  fixture.waitForTake = new Promise<void>((resolve) => { finish = resolve; });
  render();
  await press("Take control of this screen");
  await press("Watch screen 2");
  finish();
  await vi.waitFor(() => expect(fixture.requests.find(({ body }) => body.action === "release")).toMatchObject({
    path: "/api/bots/bot-1/computer/control", body: { target: "local/shared-s1", action: "release" },
  }));
  expect(document.querySelector("[data-live-target]")).toBeNull();
});
