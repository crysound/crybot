import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CryChartSpec } from "../../../shared/data-surface.ts";
import type { OptionCardData, ServerFrame, WireMessage } from "../../../shared/wire.ts";
import type { RuntimeEvent } from "../../../shared/runtime-events.ts";
import { WIDGET_NODE_TYPES, type WidgetPayload } from "../../../shared/widget.ts";

export type ManualFixture = { swiftType: string; name: string; value: unknown };

export const textMessage = {
  id: "message-1",
  role: "bot",
  kind: "text",
  at: 1,
  text: "Hello from the contract fixture",
  replyToId: "message-0",
  sender: { name: "Example Bot", id: "bot-1" },
} satisfies WireMessage;

export const optionCard = {
  title: "Choose an option",
  subtitle: "A contract card",
  options: ["yes", "no"],
  waitRequest: { waitId: "wait-1", label: "Later", followUp: "Follow up" },
} satisfies OptionCardData;

export const chartSpecs = [
  "bar", "line", "area", "scatter", "histogram", "pie", "heatmap",
].map((type) => ({ type: type as CryChartSpec["type"], x: "category", y: "value" } satisfies CryChartSpec));

export const messageKinds: readonly WireMessage["kind"][] = [
  "text", "options", "activity", "screen", "connector", "secret", "signin", "routine.run", "goal.run", "burst", "digest", "compaction", "call", "widget", "app",
];

export const frameKinds = [
  "sections", "bot.queued", "message", "message.patch", "thread", "bot", "group", "notify", "notifications.read", "group.deleted", "routine", "routine.deleted", "routine.run", "webhook", "webhook.attempt", "webhook.deleted", "app-trigger", "app-trigger.attempt", "app-trigger.deleted", "app-trigger.service", "runtime", "mcp.changed", "screen", "computer", "computer-control", "data", "bot.deleted", "bots.order", "groups.order", "live.call", "device.job", "team.presence", "thread.presence", "team.people", "config", "hello", "ping", "snapshot",
] as const satisfies readonly (ServerFrame["kind"] | "hello" | "ping" | "snapshot")[];

export const runtimeTypes: readonly RuntimeEvent["type"][] = [
  "session.started", "session.model-variants", "session.exited", "turn.started", "turn.retrying", "turn.completed", "cap.exhausted", "turn.wait_started", "turn.wait_ended", "item.started", "item.updated", "item.output", "turn.progress", "item.completed", "content.delta", "request.opened", "request.resolved", "thread.token-usage.updated", "runtime.error", "runtime.notice", "context.compacted",
];

export const widgetNodeTypes = WIDGET_NODE_TYPES;

export function readManualFixtures(): ManualFixture[] {
  const path = fileURLToPath(new URL("../../../mobile/ios/Packages/CryKit/Tests/CryCoreTests/Fixtures/manual/protocol.json", import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as ManualFixture[];
}

export const widgetPayload = {
  v: 1,
  root: { type: "Card", id: "n1", children: [{ type: "Text", id: "n2", value: "Example" }] },
} satisfies WidgetPayload;
