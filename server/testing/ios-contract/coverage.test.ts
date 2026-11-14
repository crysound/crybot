import { expect, it } from "vitest";
import { WIDGET_NODE_TYPES } from "../../../shared/widget.ts";
import { assertCoverageShape, coverage, coverageSummary } from "./coverage.ts";
import { widgets } from "./fixtures.ts";

it("checks widget table and samples in both directions", () => {
  expect(Object.keys(coverage.widgetNodes).sort()).toEqual([...WIDGET_NODE_TYPES].sort());
  expect(widgets.map(s => s.value.type).sort()).toEqual([...WIDGET_NODE_TYPES].sort());
  expect(() => assertCoverageShape()).not.toThrow();
});
it("keeps web entries pending 48 and native record rows assigned to 16", () => {
  for (const table of [coverage.widgetNodes, coverage.settingsPages, coverage.panelPages]) {
    for (const status of Object.values(table)) expect(status).toEqual({ ios: "todo", task: "48" });
  }
  for (const kind of ["routine.run", "call", "screen"] as const) expect(coverage.wireMessageKinds[kind]).toEqual({ ios: "todo", task: "16" });
  for (const kind of ["message", "runtime", "notify", "live.call", "config"] as const) expect(coverage.serverFrameKinds[kind]).toEqual({ ios: "done" });
  expect(coverageSummary().counts.skip).toBe(6);
});
