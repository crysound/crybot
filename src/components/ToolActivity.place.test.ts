import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ToolActivity } from "./ToolActivity";

describe("tool chip place icon", () => {
  it("shows the place a screen or page tool ran on, and nothing for other tools", () => {
    const browser = renderToStaticMarkup(createElement(ToolActivity, { tool: { name: "agent_browser_click", ok: true }, place: "browser" }));
    expect(browser).toContain('data-testid="tool-place"');
    expect(browser).toContain('aria-label="Browser"');
    const cloud = renderToStaticMarkup(createElement(ToolActivity, { tool: { name: "screenshot", ok: true }, place: "cloud" }));
    expect(cloud).toContain('aria-label="Cloud desktop"');
    const shell = renderToStaticMarkup(createElement(ToolActivity, { tool: { name: "Bash", ok: true } }));
    expect(shell).not.toContain('data-testid="tool-place"');
  });
});


it.each([
  ["shared", 4, "Shared computer"],
  ["shared", 1, "Private desktop"],
  ["per-bot", 4, "Private desktop"],
] as const)("names the VM icon for %s / %s screens", (mode, screens, label) => {
  const html = renderToStaticMarkup(createElement(ToolActivity, {
    tool: { name: "screenshot", ok: true }, place: "vm", config: { localVm: { mode, screens, maxInstances: 1 } },
  }));
  expect(html).toContain(`aria-label="${label}"`);
});
