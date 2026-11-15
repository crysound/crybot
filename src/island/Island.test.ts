// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Island, type IslandProps } from "./Island";
import { setLocale, t } from "../lib/i18n";
import { islandCounts } from "../../electron/island-model.mjs";
import type { WireBot } from "../../shared/wire";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const bots: WireBot[] = Array.from({ length: 8 }, (_, index) => ({ id: `bot-${index}`, threadId: `thread-${index}`, name: `Atlas ${index}`, title: "A long task that should truncate with an ellipsis", description: "", color: "green", mascotBody: index % 2 ? "star" : "dome", avatarUrl: null, unread: false, notifications: true, modelSelection: { instanceId: "fixture", model: "fixture" }, createdAt: index, activity: index === 2 ? "waiting-on-you" : index === 0 ? "working" : "idle" }));
let host: HTMLDivElement, root: Root, props: IslandProps;
beforeEach(() => {
  setLocale("en"); host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  props = { state: { mode: "hidden", botId: null, typing: false }, geometry: { menuHeight: 38, notched: true, sensorWidth: 200, x: 0, y: 0, width: 520, height: 620 }, snapshot: { revision: 1, bots, avatars: {}, online: true, chat: null }, bridge: { ready: vi.fn(), action: vi.fn(async () => {}), send: vi.fn(async () => {}), respond: vi.fn(async () => {}), open: vi.fn(async () => {}), onUpdate: vi.fn() } };
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
const render = async () => { await act(async () => root.render(createElement(Island, props))); };
const click = async (selector: string) => { await act(async () => host.querySelector<HTMLButtonElement>(selector)!.click()); };
it("hidden renders no avatars, messages or approval alerts", async () => {
  await render(); expect(host.querySelector("main")?.dataset.mode).toBe("hidden"); expect(host.textContent).toBe(""); expect(host.querySelector("svg,img,button")).toBeNull();
});
it("summary uses six real mascot avatars, +N and translated total status", async () => {
  props.state.mode = "summary"; await render(); expect(host.querySelectorAll("svg").length).toBe(6); expect(host.textContent).toContain("+2"); expect(host.textContent).toContain("8 agents · 1 working · 1 need you");
  await click("button"); expect(props.bridge.action).toHaveBeenCalledWith({ type: "expand" });
  setLocale("zh"); expect(t("island.total", islandCounts(bots))).toBe("8 个智能体 · 1 在干活 · 1 等你");
});
it("grid highlights waiting agents first and preserves names, status and truncated task titles", async () => {
  props.state.mode = "list"; await render(); const first = host.querySelector(".agent")!;
  expect(first.classList.contains("waiting")).toBe(true); expect(first.textContent).toContain("Atlas 2"); expect(first.textContent).toContain("Needs your approval"); expect(first.querySelector("svg")).not.toBeNull(); expect(first.querySelector(".task")?.getAttribute("title")).toContain("long task"); expect(host.querySelectorAll(".agent").length).toBe(8);
  await click(".agent"); expect(props.bridge.action).toHaveBeenCalledWith({ type: "select", botId: "bot-2" });
});
it("custom avatars reuse BotAvatar with fetched raster data and its crop", async () => {
  props.state.mode = "list";
  props.snapshot.bots = [{ ...bots[0], avatarUrl: "/api/attachments/fixture.png", avatarCrop: "circle" }];
  props.snapshot.avatars = { "/api/attachments/fixture.png": "data:image/png;base64,AA==" };
  await render(); expect(host.querySelector("img")?.src).toBe("data:image/png;base64,AA=="); expect(host.querySelector("img")?.parentElement?.style.borderRadius).toBe("50%"); expect(host.querySelector("svg")).toBeNull();
});
it("chat streams, approves, opens the same chat, and reports typing", async () => {
  props.state = { mode: "chat", botId: "bot-2", typing: false };
  props.snapshot.chat = { botId: "bot-2", threadId: "latest", streaming: "Live reply", messages: [{ id: "a", role: "bot", kind: "options", at: 0, card: { title: "Run command", subtitle: "Review this action", options: [], requestId: "ask", requestType: "permission" } }] };
  await render(); expect(host.textContent).toContain("Live reply"); expect(host.textContent).toContain("Atlas 2");
  await click(".approval-buttons .send"); expect(props.bridge.respond).toHaveBeenCalledWith(1, "ask", "allow");
  await click(".open-main"); expect(props.bridge.open).toHaveBeenCalledWith(1);
  await act(async () => host.querySelector("input")!.focus()); expect(props.bridge.action).toHaveBeenCalledWith({ type: "typing", value: true });
  await click(".back"); expect(props.bridge.action).toHaveBeenCalledWith({ type: "back" });
});

it("offline summary does not report cached work or approvals", async () => {
  props.state.mode = "summary"; props.snapshot.online = false; await render();
  expect(host.textContent).not.toContain("1 working"); expect(host.textContent).not.toContain("1 need you");
  expect(host.textContent).toContain("Offline");
});
it.each(["skillRequest", "routineRequest", "profileRequest", "mcpRequest", "questionRequest", "accessRequest", "computerAsk", "outsideWrite", "webhookRequest", "appTriggerRequest", "teamMemoryRequest", "modelRequest", "teamSetupRequest", "waitRequest", "outboundRequest", "lendingLift", "quotaSwitch"])("%s requires review in the main window", async field => {
  props.state = { mode: "chat", botId: "bot-2", typing: false };
  props.snapshot.chat = { botId: "bot-2", threadId: "latest", streaming: "", messages: [{ id: "special", role: "bot", kind: "options", at: 0, card: { title: "Review", subtitle: "Details", options: [], requestId: "ask", requestType: "permission", [field]: { sha256: "fixture" } } }] };
  await render(); expect(host.querySelector(".approval-buttons")).toBeNull();
  expect(host.querySelector(".approval")?.textContent).toContain("Open in main window");
  await click(".approval button"); expect(props.bridge.open).toHaveBeenCalledWith(1);
  expect(props.bridge.respond).not.toHaveBeenCalled();
});

it("shows the place mismatch hint as a single summary line", async () => {
  props.state = { mode: "summary", botId: null, typing: false, notice: "place-changed" };
  await render(); expect(host.textContent).toContain("Main window changed or loading");
  expect(host.querySelector(".avatar-stack")).toBeNull();
});
