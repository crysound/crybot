import { describe, expect, it, vi } from "vitest";

import type { Message } from "../store.ts";
import { messagePages, pageMessage, TOOL_OUTPUT_PREVIEW } from "./message-pages.ts";
import { personDisplayName, sessionsByPerson } from "../person-name.ts";
import { personKey } from "../person-key.ts";

it("refreshes one session snapshot per page or window while preserving sender ids and stored names", () => {
  const session = { id: "alex", accessEmail: "alex@example.test", displayName: "Alex" };
  const key = personKey({ id: session.id });
  const messages: Message[] = [
    { id: "one", role: "user", kind: "text", at: 1, sender: { id: key, name: "Chrome on Mac" } },
    { id: "two", role: "user", kind: "text", at: 2, sender: { id: key, name: "Safari on iPhone" } },
    { id: "three", role: "user", kind: "text", at: 3, sender: { id: "unknown", name: "Unknown speaker" } },
  ];
  const store = {
    messagesFor: () => messages,
    messagesTail: () => ({ messages, hasMore: false, activeLeafId: "three" }),
    activeLeaf: () => "three",
  };
  const snapshot = vi.fn(() => {
    const byPerson = sessionsByPerson([{ ...session }]);
    return (sender: { id?: string; name: string }) => {
      const current = sender.id ? byPerson.get(sender.id) : undefined;
      return current ? personDisplayName(current) : sender.name;
    };
  });
  const pages = messagePages(store, snapshot);
  const reads = [
    () => pages.messagePage("thread", undefined),
    () => pages.messagePage("thread", 200),
    () => pages.messagePage("thread", 200, "three"),
    () => pages.messageWindow("thread", "two", 200)!,
  ];
  for (const read of reads) {
    snapshot.mockClear();
    session.displayName += "!";
    const page = read();
    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(page.messages.slice(0, 2).map((message) => message.sender)).toEqual([
      { id: key, name: session.displayName }, { id: key, name: session.displayName },
    ]);
    if (page.messages.length === 3) expect(page.messages[2]!.sender).toEqual({ id: "unknown", name: "Unknown speaker" });
  }
  expect(messages[0]!.sender).toEqual({ id: key, name: "Chrome on Mac" });
  expect(messages[1]!.sender).toEqual({ id: key, name: "Safari on iPhone" });
  expect(messagePages(store).messagePage("thread", 200).messages).toEqual(messages);
});

const step = (output: string | undefined, extra: Partial<Message> = {}): Message => ({
  id: "m1", role: "bot", kind: "activity", at: 1, text: "", turnId: "t1",
  tool: { name: "Read", ok: true, summary: "read notes.md", input: JSON.stringify({ path: "notes.md", text: "x".repeat(5_000) }), output },
  ...extra,
} as Message);

describe("pageMessage", () => {
  it("leaves a step whose output fits the preview exactly as stored", () => {
    for (const output of [undefined, "", "short", "y".repeat(TOOL_OUTPUT_PREVIEW)]) {
      const message = step(output);
      expect(pageMessage(message)).toBe(message);
    }
  });

  it("cuts a long output to its start, marks it clipped and keeps everything else", () => {
    const message = step("z".repeat(6_000));
    const paged = pageMessage(message) as Message;
    expect(paged.tool).toEqual({ ...message.tool, output: "z".repeat(TOOL_OUTPUT_PREVIEW), clipped: true });
    expect(paged.tool!.input).toBe(message.tool!.input);
    expect({ ...paged, tool: undefined }).toEqual({ ...message, tool: undefined });
    expect(message.tool!.output).toHaveLength(6_000);
    expect(message.tool).not.toHaveProperty("clipped");
  });

  it("never splits a surrogate pair at the cut", () => {
    const output = `${"a".repeat(TOOL_OUTPUT_PREVIEW - 1)}😀${"b".repeat(50)}`;
    const paged = pageMessage(step(output)) as Message;
    expect(paged.tool!.output).toBe("a".repeat(TOOL_OUTPUT_PREVIEW - 1));
    expect(paged.tool).toHaveProperty("clipped", true);
  });

  it("keeps whole the rows whose output is the reply itself", () => {
    const long = "r".repeat(6_000);
    const rows: Array<Partial<Message>> = [
      { relay: { kind: "told", email: "bob@example.com", name: "Bob" } },
      { roomRequest: { id: "q1", phase: "result" } },
      { comm: { groupId: "g1", withBotId: "b2", withName: "Ada", withColor: "blue" } },
      { threadRef: { botId: "b1", threadId: "th2", title: "Side job" } },
      { kind: "text" },
    ];
    for (const extra of rows) {
      const message = step(long, extra);
      expect(pageMessage(message)).toBe(message);
    }
  });

  it("still drops a screen's picture", () => {
    const screen = { id: "s1", role: "bot", kind: "screen", at: 1, text: "", png: "iVBOR" } as Message;
    expect(pageMessage(screen)).toEqual({ id: "s1", role: "bot", kind: "screen", at: 1, text: "", hasImage: true });
  });

  it("refreshes a historical sender name only in the wire copy", () => {
    const message = { id: "m2", role: "user", kind: "text", at: 1, text: "hi", sender: { id: "p1", name: "Chrome on Mac" } } as Message;
    const paged = pageMessage(message, (sender) => sender.id === "p1" ? "张三" : sender.name) as Message;
    expect(paged.sender?.name).toBe("张三");
    expect(message.sender?.name).toBe("Chrome on Mac");
  });
});
