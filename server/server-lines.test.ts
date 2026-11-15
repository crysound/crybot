import { describe, expect, it } from "vitest";
import "./server-line-packs.ts";
import { isServerLine, serverLine } from "./server-lines.ts";

describe("serverLine", () => {
  it("writes the line in the selected language and fills its values", () => {
    expect(serverLine("zh", "server.mcp.added", { name: "Calendar" })).toBe("已添加 MCP 服务器 Calendar");
    expect(serverLine(undefined, "server.mcp.added", { name: "Calendar" })).toBe("Added MCP server Calendar");
  });

  it("resolves regional languages and falls back to English for unknown languages", () => {
    expect(serverLine("zh-Hant", "server.mcp.added")).toBe(serverLine("zh", "server.mcp.added"));
    expect(serverLine("de-AT", "server.mcp.added")).toBe(serverLine(undefined, "server.mcp.added"));
    expect(serverLine("pt", "server.mcp.added")).toBe(serverLine(undefined, "server.mcp.added"));
    expect(serverLine("nl", "server.mcp.added")).toBe("Added MCP server {name}");
  });

  it("keeps unfilled placeholders", () => {
    expect(serverLine("en", "server.mcp.added", {})).toBe("Added MCP server {name}");
  });
});

it.each([
  ["server.rooms.postedIn", "Gepostet in Standup"],
  ["server.rooms.held", "Biber ist angehalten (von dir gestoppt). Erwähne ihn mit @ oder schreib „resume“"],
  ["server.teammates.waitCardClosed", "O cartão aguardado foi substituído ou fechado"],
] as const)("recognizes historical %s without offering its language for new lines", (key, text) => {
  expect(isServerLine(key, text)).toBe(true);
  expect(isServerLine(key, "Please help me with my inbox")).toBe(false);
  expect(serverLine("de", key)).toBe(serverLine("en", key));
  expect(serverLine("pt-br", key)).toBe(serverLine("en", key));
});
