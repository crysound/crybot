import type { RuntimeEvent } from "../../../shared/runtime-events.ts";
import type { ServerFrame, WireMessage, OptionCardData } from "../../../shared/wire.ts";
import { WIDGET_NODE_TYPES } from "../../../shared/widget.ts";
import type { SettingsPageId } from "../../../src/state/store.tsx";
import type { PageId } from "../../../src/components/bot-panel/page-registry.ts";

export type IosStatus =
  | { ios: "done" }
  | { ios: "web"; route: string }
  | { ios: "todo"; task: string }
  | { ios: "skip"; reason: string };

export const RETAINED_TASKS = ["05", "06", "07", "08", "09", "10", "11", "12", "14", "15", "16", "22", "23", "34", "35", "48"] as const;
const todo = (task: string): IosStatus => ({ ios: "todo", task });
const done: IosStatus = { ios: "done" };
const skip = (reason: string): IosStatus => ({ ios: "skip", reason });

export const wireMessageKinds = {
  text: todo("08"), options: todo("15"), activity: todo("10"), screen: todo("16"), connector: todo("16"), secret: todo("16"), signin: todo("16"),
  "routine.run": todo("16"), "goal.run": todo("16"), burst: todo("16"), digest: todo("16"), compaction: todo("16"), call: todo("16"), widget: todo("48"), app: todo("48"),
} satisfies Record<WireMessage["kind"], IosStatus>;

export const serverFrameKinds = {
  sections: done, "bot.queued": done, message: done, "message.patch": done, thread: done, bot: done, group: done, notify: done, "notifications.read": done, "group.deleted": done,
  routine: todo("48"), "routine.deleted": todo("48"), "routine.run": todo("48"), webhook: todo("48"), "webhook.attempt": todo("48"), "webhook.deleted": todo("48"), "app-trigger": todo("48"), "app-trigger.attempt": todo("48"), "app-trigger.deleted": todo("48"), "app-trigger.service": todo("48"), runtime: done, "mcp.changed": todo("48"), screen: done, computer: done, "computer-control": done, data: todo("48"), "bot.deleted": done, "bots.order": done, "groups.order": done, "live.call": done, "device.job": todo("48"), "team.presence": done, "thread.presence": done, "team.people": done, config: done, hello: done, ping: done, snapshot: done,
} satisfies Record<ServerFrame["kind"], IosStatus> & Record<"hello" | "ping" | "snapshot", IosStatus>;

export const wireMessageFields = {
  "textCode": todo("16"),
  "textParams": todo("16"),
  "helperFollowup": todo("16"),
  "helperIntro": todo("16"),
  "setupOffer": todo("16"),
  "setupChoices": todo("16"),
  "setupChoicesPending": todo("16"),
  "setupChoicesUpdating": todo("16"),
  "bugReport": todo("16"),
  "wait": todo("16"),
  "roomRequest": todo("16"),
  "id": todo("08"),
  "role": todo("08"),
  "kind": todo("08"),
  "text": todo("08"),
  "digest": todo("16"),
  "engineCompaction": todo("16"),
  "compaction": todo("16"),
  "attachments": todo("14"),
  "card": todo("15"),
  "widget": todo("48"),
  "serverCard": todo("16"),
  "setupSuggestion": todo("16"),
  "setupRequest": todo("16"),
  "app": todo("48"),
  "fromApp": todo("16"),
  "pointed": todo("16"),
  "connector": todo("16"),
  "secret": todo("16"),
  "signIn": todo("16"),
  "routineRun": todo("16"),
  "automation": todo("16"),
  "goalRun": todo("16"),
  "call": todo("16"),
  "tool": todo("10"),
  "webhookPost": todo("16"),
  "steered": todo("08"),
  "aside": todo("08"),
  "via": todo("16"),
  "callId": todo("16"),
  "relayed": todo("16"),
  "sender": todo("08"),
  "turnId": todo("08"),
  "stoppedBy": todo("08"),
  "itemId": todo("08"),
  "requestMessageId": todo("08"),
  "turnSucceeded": todo("08"),
  "requestCancelled": todo("08"),
  "requestPending": todo("08"),
  "turnTerminal": todo("08"),
  "turnCompletedAt": todo("08"),
  "savedSteps": todo("10"),
  "png": todo("14"),
  "mime": todo("14"),
  "at": todo("08"),
  "parentId": todo("08"),
  "replyToId": todo("08"),
  "sendId": todo("08"),
  "channelMode": todo("08"),
  "from": todo("08"),
  "threadPost": todo("08"),
  "peerPost": todo("08"),
  "routedBy": todo("08"),
  "quickModel": todo("08"),
  "doneWhen": todo("08"),
  "peerAsk": todo("08"),
  "reactions": todo("08"),
  "reaction": todo("08"),
  "comm": todo("08"),
  "relay": todo("08"),
  "inbox": todo("08"),
  "threadRef": todo("08"),
  "sentDirectly": todo("08"),
  "publishedPage": todo("48"),
  "dataResult": todo("48"),
  "dataContext": todo("48"),
  "queued": todo("08"),
  "queueId": todo("08"),
  "burst": todo("16"),
} satisfies Record<keyof WireMessage, IosStatus>;

export const optionCardFields = {
  "waitRequest": todo("16"),
  "computerAsk": todo("16"),
  "accessRequest": todo("16"),
  "outsideWrite": todo("16"),
  "lendingLift": todo("16"),
  "outboundRequest": todo("16"),
  "teamMemoryRequest": todo("16"),
  "title": todo("15"),
  "subtitle": todo("15"),
  "summaryCode": todo("15"),
  "summaryParams": todo("15"),
  "options": todo("15"),
  "requestType": todo("15"),
  "answered": todo("15"),
  "answeredText": todo("15"),
  "dismissed": todo("15"),
  "answeredBy": todo("15"),
  "requestId": todo("15"),
  "tool": todo("15"),
  "held": todo("15"),
  "expired": todo("15"),
  "stopped": todo("15"),
  "heldCode": todo("15"),
  "allowKey": todo("15"),
  "allowSession": todo("15"),
  "commandAllowlist": todo("15"),
  "approvalScope": todo("15"),
  "autoApplied": todo("15"),
  "undone": todo("15"),
  "routineRequest": todo("16"),
  "webhookRequest": todo("16"),
  "appTriggerRequest": todo("16"),
  "profileRequest": todo("16"),
  "modelRequest": todo("16"),
  "teamSetupRequest": todo("16"),
  "mcpRequest": todo("16"),
  "skillRequest": todo("16"),
  "questionRequest": todo("15"),
  "fixedOptions": todo("15"),
  "quotaSwitch": todo("16"),
  "yourComputer": todo("16"),
} satisfies Record<keyof OptionCardData, IosStatus>;

export const widgetNodes = {
  "Card": todo("48"),
  "ListView": todo("48"),
  "ListViewItem": todo("48"),
  "Box": todo("48"),
  "Row": todo("48"),
  "Col": todo("48"),
  "Form": todo("48"),
  "Spacer": todo("48"),
  "Divider": todo("48"),
  "Table": todo("48"),
  "Table.Row": todo("48"),
  "Table.Cell": todo("48"),
  "Text": todo("48"),
  "Title": todo("48"),
  "Caption": todo("48"),
  "Label": todo("48"),
  "Markdown": todo("48"),
  "Image": todo("48"),
  "Icon": todo("48"),
  "Chart": todo("48"),
  "Badge": todo("48"),
  "Progress": todo("48"),
  "Button": todo("48"),
  "Select": todo("48"),
  "DatePicker": todo("48"),
  "TimePicker": todo("48"),
  "DayPicker": todo("48"),
  "Checkbox": todo("48"),
  "RadioGroup": todo("48"),
  "Input": todo("48"),
  "Textarea": todo("48"),
  "Transition": todo("48"),
} satisfies Record<string, IosStatus>;
export const settingsPages = {
  "overview": todo("48"),
  "phone": todo("48"),
  "ai": todo("48"),
  "bots": todo("48"),
  "desktops": todo("48"),
  "vault": todo("48"),
  "usage": todo("48"),
  "transfer": todo("48"),
  "data": todo("48"),
  "people": todo("48"),
  "installations": todo("48"),
  "account": todo("48"),
  "plan": todo("48"),
  "app": todo("48"),
  "general": todo("48"),
  "appearance": todo("48"),
} satisfies Record<SettingsPageId, IosStatus>;
export const panelPages = {
  "settings": todo("48"),
  "where": todo("48"),
  "setup": todo("48"),
  "model": todo("48"),
  "instructions": todo("48"),
  "approvals": todo("48"),
  "always": todo("48"),
  "routines": todo("48"),
  "apps": todo("48"),
  "memory": todo("48"),
  "skills": todo("48"),
  "browser": todo("48"),
  "folder": todo("48"),
  "android": todo("48"),
  "voice": todo("48"),
  "blurb": todo("48"),
  "team": todo("48"),
  "chiefteams": todo("48"),
  "mcp": todo("48"),
  "tools": todo("48"),
  "webhooks": todo("48"),
  "visibility": todo("48"),
  "slack": todo("48"),
  "overview": todo("48"),
  "prompt": todo("48"),
  "history": todo("48"),
} satisfies Record<PageId, IosStatus>;

export const runtimeEventTypes = {
  "session.started": todo("10"),
  "session.model-variants": todo("10"),
  "session.exited": todo("10"),
  "turn.started": todo("10"),
  "turn.retrying": todo("10"),
  "turn.completed": todo("10"),
  "cap.exhausted": todo("10"),
  "turn.wait_started": todo("10"),
  "turn.wait_ended": todo("10"),
  "item.started": todo("10"),
  "item.updated": todo("10"),
  "item.output": todo("10"),
  "turn.progress": todo("10"),
  "item.completed": todo("10"),
  "content.delta": todo("10"),
  "request.opened": todo("10"),
  "request.resolved": todo("10"),
  "thread.token-usage.updated": todo("10"),
  "runtime.error": todo("10"),
  "runtime.notice": todo("10"),
  "context.compacted": todo("10"),
} satisfies Record<RuntimeEvent["type"], IosStatus>;

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
