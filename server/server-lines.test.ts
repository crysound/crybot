import { describe, expect, it } from "vitest";
import "./server-line-packs.ts";
import { serverLine } from "./server-lines.ts";

describe("serverLine", () => {
  it("writes the line in the selected language and fills its values", () => {
    expect(serverLine("de", "server.mcp.added", { name: "Calendar" })).toBe("MCP-Server Calendar hinzugefügt");
    expect(serverLine(undefined, "server.mcp.added", { name: "Calendar" })).toBe("Added MCP server Calendar");
  });

  it("resolves regional languages and falls back to English for unknown languages", () => {
    expect(serverLine("de-AT", "server.mcp.added", { name: "Calendar" })).toBe("MCP-Server Calendar hinzugefügt");
    expect(serverLine("pt", "server.mcp.added")).toBe(serverLine("pt-br", "server.mcp.added"));
    expect(serverLine("zh-Hant", "server.mcp.added")).toBe(serverLine("zh-tw", "server.mcp.added"));
    expect(serverLine("nl", "server.mcp.added")).toBe("Added MCP server {name}");
  });

  it("keeps unfilled placeholders", () => {
    expect(serverLine("en", "server.mcp.added", {})).toBe("Added MCP server {name}");
  });
});
