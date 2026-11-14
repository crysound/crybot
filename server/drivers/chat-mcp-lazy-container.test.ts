import { rmSync } from "node:fs";
import { expect, it } from "vitest";
import { catalogServer } from "../testing/cua-driver-tools.ts";
import { mountChatTools } from "./chat-mcp-tools.ts";

it("retains lazy computer discovery while applying tool selection and approvals to the inner call", async () => {
  const { dir, server } = catalogServer(["search_tools", "describe_tool", "call_tool"]);
  const controller = new AbortController();
  let session: Awaited<ReturnType<typeof mountChatTools>> | undefined;
  try {
    session = await mountChatTools({ localComputer: { ...server, env: { ...server.env, CRYBOT_CONTAINER_LAZY: "1" } } },
      controller.signal, true, { allow: ["mcp:computer:click"] });
    expect(session.definitions.map(tool => tool.function.name)).toEqual(["computer_search_tools", "computer_describe_tool", "computer_call_tool"]);
    expect(() => session!.validate("computer_search_tools", { query: "click" })).not.toThrow();
    expect(() => session!.validate("computer_call_tool", { name: "click", arguments: { x: 10 } })).not.toThrow();
    expect(() => session!.validate("computer_call_tool", { name: "type_text", arguments: { text: "test" } })).toThrow("selection excludes");
    expect(session.view("computer_call_tool", { name: "click", arguments: { x: 10 } })).toMatchObject({ title: "computer_click", input: { x: 10 }, ask: true });
  } finally {
    await session?.close();
    controller.abort();
    rmSync(dir, { recursive: true, force: true });
  }
});
