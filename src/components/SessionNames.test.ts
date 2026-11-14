import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Bot, Group, InstanceInfo, Message } from "@/state/store";

const fixture = vi.hoisted(() => ({ reactor: "p_me", displayName: "张三" }));
vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return { ...original, useStore: () => ({ state: {
    ...original.initialState, config: { profile: { name: "Local profile" } },
    instances: [{ instanceId: "test", driverKind: "codex", displayName: "Test" } as InstanceInfo],
  }, dispatch: vi.fn() }) };
});
vi.mock("./DesktopCapabilities", () => ({
  useDesktopCapabilities: () => ({ capabilities: { dictation: { available: false }, host: { packaged: true, platform: "other" }, localComputer: { available: false } }, ready: true }),
  useCaptionChrome: () => ({}),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/thread-preferences", () => ({ useShowThreads: () => false, useShowThreadsChoice: () => false, setShowThreads: vi.fn() }));
vi.mock("@/lib/interface-mode", () => ({ useAdvancedMode: () => false, setAdvancedMode: vi.fn() }));
vi.mock("@/lib/cloud-guest", () => ({ useCanWriteIn: () => true, useReactor: () => fixture.reactor }));
vi.mock("@/lib/session-profile", () => ({ useSessionDisplayName: () => fixture.displayName }));
vi.mock("./CitationUI", () => ({ CitationSelectionToolbar: () => null, SentCitations: () => null }));
vi.mock("./ModelPicker", () => ({ ModelPicker: () => null }));
vi.mock("./ApprovalModeSelector", () => ({ ApprovalModeSelector: () => null }));
vi.mock("./ChatMarkdown", () => ({ ChatMarkdown: ({ mentionPerson }: { mentionPerson?: { profileName?: string } }) => createElement("span", { "data-mention-name": mentionPerson?.profileName }) }));

const { ChatView } = await import("./ChatView");
const { Transcript } = await import("./GroupView");
const messages: Message[] = [
  { id: "mine", role: "user", kind: "text", at: 1, text: "My words", sender: { id: "p_me", name: "Own sender name" } },
  { id: "other", role: "user", kind: "text", at: 2, text: "Other words", sender: { id: "p_other", name: "Alex" } },
  { id: "reply", role: "bot", kind: "text", at: 3, text: "@张三 hello", from: { botId: "bot", name: "Sample", color: "blue" } },
];
const bot: Bot = {
  id: "bot", threadId: "thread", name: "Sample", title: "", description: "", color: "blue", notifications: true,
  unread: false, busy: false, messages, modelSelection: { instanceId: "test", model: "test" },
  tasks: [{ threadId: "thread", title: "Thread", createdAt: 1, busy: false, activity: "idle", modelSelection: { instanceId: "test", model: "test" }, approvalMode: "ask" }],
};
const group: Group = {
  id: "group", threadId: "group-thread", name: "Room", memberIds: [bot.id], defaultResponder: { kind: "member", botId: bot.id },
  bulletin: "", unread: false, createdAt: 1, messages,
};

beforeEach(() => { vi.stubGlobal("window", {}); fixture.reactor = "p_me"; });
afterEach(() => vi.unstubAllGlobals());

it.each(["chat", "room"])("uses the login name for self mentions and shows only other speakers in %s", (view) => {
  const render = () => renderToStaticMarkup(view === "chat" ? createElement(ChatView, { bot }) : createElement(Transcript, {
    group, members: [bot], locale: "en", messages, transcript: messages, onReply: () => {},
  }));
  const shared = render();
  expect(shared).toContain('data-mention-name="张三"');
  expect(shared).not.toContain('data-mention-name="Local profile"');
  expect(shared).toContain(">Alex<");
  expect(shared).not.toContain(">Own sender name<");
  fixture.reactor = "user";
  expect(render()).not.toContain(">Alex<");
});
