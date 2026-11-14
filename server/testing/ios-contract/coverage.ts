import type { RuntimeEvent } from "../../../shared/runtime-events.ts";
import type { ServerFrame, WireMessage, OptionCardData } from "../../../shared/wire.ts";
import { WIDGET_NODE_TYPES } from "../../../shared/widget.ts";
// The source SettingsPageId lives in a TSX module that the server compiler intentionally excludes.
// @ts-expect-error TS6142: this type-only import is checked by the frontend compiler.
import type { SettingsPageId } from "../../../src/state/store.tsx";
type PageId = "settings" | "where" | "setup" | "model" | "instructions" | "approvals" | "always" | "routines" | "apps" | "memory" | "skills" | "browser" | "folder" | "android" | "voice" | "blurb" | "team" | "chiefteams" | "mcp" | "tools" | "webhooks" | "visibility" | "slack" | "overview" | "prompt" | "history";

export type IosStatus =
  | { ios: "done" }
  | { ios: "web"; route: string }
  | { ios: "todo"; task: string }
  | { ios: "skip"; reason: string };

export const RETAINED_TASKS = ["05", "06", "07", "08", "09", "10", "11", "12", "14", "15", "16", "22", "23", "34", "35", "48"] as const;
const todo = (task: string): IosStatus => ({ ios: "todo", task });
const done: IosStatus = { ios: "done" };
const skip = (reason: string): IosStatus => ({ ios: "skip", reason });

export const wireMessageKinds: Record<WireMessage["kind"], IosStatus> = {
  text: todo("08"), options: todo("15"), activity: todo("10"), screen: todo("35"), connector: todo("16"), secret: todo("16"), signin: todo("16"),
  "routine.run": todo("48"), "goal.run": todo("16"), burst: todo("16"), digest: todo("16"), compaction: todo("16"), call: todo("48"), widget: todo("48"), app: todo("48"),
};

export const serverFrameKinds: Record<ServerFrame["kind"], IosStatus> & Record<"hello" | "ping" | "snapshot", IosStatus> = {
  sections: done, "bot.queued": todo("08"), message: todo("08"), "message.patch": todo("08"), thread: todo("08"), bot: todo("07"), group: todo("22"), notify: todo("23"), "notifications.read": todo("23"), "group.deleted": todo("22"),
  routine: todo("48"), "routine.deleted": todo("48"), "routine.run": todo("48"), webhook: todo("48"), "webhook.attempt": todo("48"), "webhook.deleted": todo("48"), "app-trigger": todo("48"), "app-trigger.attempt": todo("48"), "app-trigger.deleted": todo("48"), "app-trigger.service": todo("48"), runtime: todo("10"), "mcp.changed": todo("48"), screen: done, computer: done, "computer-control": done, data: todo("48"), "bot.deleted": todo("07"), "bots.order": todo("07"), "groups.order": todo("22"), "live.call": todo("48"), "device.job": todo("48"), "team.presence": todo("48"), "thread.presence": todo("48"), "team.people": todo("48"), config: todo("48"), hello: done, ping: done, snapshot: todo("07"),
};

const wireMessageKeys = [
  "textCode", "textParams", "helperFollowup", "helperIntro", "setupOffer", "setupChoices", "setupChoicesPending", "setupChoicesUpdating", "bugReport", "wait", "roomRequest", "id", "role", "kind", "text", "digest", "engineCompaction", "compaction", "attachments", "card", "widget", "serverCard", "setupSuggestion", "setupRequest", "app", "fromApp", "pointed", "connector", "secret", "signIn", "routineRun", "automation", "goalRun", "call", "tool", "webhookPost", "steered", "aside", "via", "callId", "relayed", "sender", "turnId", "stoppedBy", "itemId", "requestMessageId", "turnSucceeded", "requestCancelled", "requestPending", "turnTerminal", "turnCompletedAt", "savedSteps", "png", "mime", "at", "parentId", "replyToId", "sendId", "channelMode", "from", "threadPost", "peerPost", "routedBy", "quickModel", "doneWhen", "peerAsk", "reactions", "reaction", "comm", "relay", "inbox", "threadRef", "sentDirectly", "publishedPage", "dataResult", "dataContext", "queued", "queueId",
] as const satisfies readonly (keyof WireMessage)[];

const nativeMessageFields16 = new Set(["connector", "secret", "signIn", "routineRun", "burst", "digest", "compaction", "goalRun", "tool"]);
const nativeMessageFields08 = new Set(["replyToId", "sender", "from", "threadPost", "peerPost", "routedBy", "quickModel", "doneWhen", "peerAsk", "comm", "relay", "inbox", "threadRef", "sentDirectly"]);
export const wireMessageFields: Record<keyof WireMessage, IosStatus> = Object.fromEntries(wireMessageKeys.map((key) => [key, todo(nativeMessageFields08.has(key) ? "08" : nativeMessageFields16.has(key) ? "16" : "48")])) as Record<keyof WireMessage, IosStatus>;

const optionCardKeys = [
  "waitRequest", "computerAsk", "accessRequest", "outsideWrite", "lendingLift", "outboundRequest", "teamMemoryRequest", "title", "subtitle", "summaryCode", "summaryParams", "options", "requestType", "answered", "answeredText", "dismissed", "answeredBy", "requestId", "tool", "held", "expired", "stopped", "heldCode", "allowKey", "allowSession", "commandAllowlist", "approvalScope", "autoApplied", "undone", "routineRequest", "webhookRequest", "appTriggerRequest", "profileRequest", "modelRequest", "teamSetupRequest", "mcpRequest", "skillRequest", "questionRequest", "fixedOptions", "quotaSwitch", "yourComputer",
] as const satisfies readonly (keyof OptionCardData)[];
const approvalCardFields = new Set(["title", "subtitle", "summaryCode", "summaryParams", "options", "requestType", "answered", "answeredText", "dismissed", "answeredBy", "requestId"]);
export const optionCardFields: Record<keyof OptionCardData, IosStatus> = Object.fromEntries(optionCardKeys.map((key) => [key, todo(approvalCardFields.has(key) ? "15" : "16")])) as Record<keyof OptionCardData, IosStatus>;

export const widgetNodes: Record<string, IosStatus> = Object.fromEntries(WIDGET_NODE_TYPES.map((type) => [type, todo("48")]));
export const settingsPages: Record<SettingsPageId, IosStatus> = Object.fromEntries([
  "overview", "phone", "ai", "bots", "desktops", "vault", "usage", "transfer", "data", "people", "installations", "account", "plan", "app", "general", "appearance",
].map((id) => [id, todo("48")])) as Record<SettingsPageId, IosStatus>;
export const panelPages: Record<PageId, IosStatus> = Object.fromEntries([
  "settings", "where", "setup", "model", "instructions", "approvals", "always", "routines", "apps", "memory", "skills", "browser", "folder", "android", "voice", "blurb", "team", "chiefteams", "mcp", "tools", "webhooks", "visibility", "slack", "overview", "prompt", "history",
].map((id) => [id, todo("48")])) as Record<PageId, IosStatus>;

export const runtimeEventTypes: Record<RuntimeEvent["type"], IosStatus> = Object.fromEntries([
  "session.started", "session.model-variants", "session.exited", "turn.started", "turn.retrying", "turn.completed", "cap.exhausted", "turn.wait_started", "turn.wait_ended", "item.started", "item.updated", "item.output", "turn.progress", "item.completed", "content.delta", "request.opened", "request.resolved", "thread.token-usage.updated", "runtime.error", "runtime.notice", "context.compacted",
].map((type) => [type, todo("10")])) as Record<RuntimeEvent["type"], IosStatus>;

export const skippedItems: Record<string, IosStatus> = {
  startup: skip("仅 Electron 的开机自启动依赖 window.cry"),
  localComputerControl: skip("仅 Electron 的本机电脑控制依赖 window.cry"),
  localOllama: skip("仅桌面版提供本地 Ollama 桥接"),
  desktopUpdates: skip("桌面版更新依赖 Electron updater"),
  usbHost: skip("USB 主机端只存在于 Electron"),
  chatFind: skip("第一期不做聊天内查找"),
};

export const coverage = { wireMessageKinds, serverFrameKinds, wireMessageFields, optionCardFields, widgetNodes, settingsPages, panelPages, runtimeEventTypes, skippedItems } as const;

export function coverageSummary() {
  const counts = { done: 0, web: 0, todo: 0, skip: 0 };
  const todos: Array<{ area: string; key: string; task: string }> = [];
  for (const [area, values] of Object.entries(coverage)) {
    for (const [key, status] of Object.entries(values)) {
      counts[status.ios] += 1;
      if (status.ios === "todo") todos.push({ area, key, task: status.task });
    }
  }
  return { counts, todos };
}

export function assertCoverageShape(): void {
  for (const [area, values] of Object.entries(coverage)) {
    for (const [key, status] of Object.entries(values)) {
      if (status.ios === "todo" && !(RETAINED_TASKS as readonly string[]).includes(status.task)) throw new Error(`${area}.${key} uses deleted task ${status.task}`);
      if (status.ios === "skip" && !status.reason.trim()) throw new Error(`${area}.${key} has an empty skip reason`);
    }
  }
  for (const type of WIDGET_NODE_TYPES) if (!Object.hasOwn(widgetNodes, type)) throw new Error(`missing widget node ${type}`);
  for (const type of Object.keys(widgetNodes)) if (!WIDGET_NODE_TYPES.includes(type)) throw new Error(`extra widget node ${type}`);
}

void skip;
