import { describe, expect, it } from "vitest";
import { WIDGET_NODE_TYPES } from "../../../shared/widget.ts";
import { RETAINED_TASKS, assertCoverageShape, coverage, coverageSummary } from "./coverage.ts";
import { frameKinds, messageKinds, runtimeTypes } from "./fixtures.ts";

describe("iOS contract coverage", () => {
  it("lists every discriminated kind and runtime type", () => {
    expect(Object.keys(coverage.serverFrameKinds).sort()).toEqual([...new Set(frameKinds)].sort());
    expect(Object.keys(coverage.wireMessageKinds).sort()).toEqual([...messageKinds].sort());
    expect(Object.keys(coverage.runtimeEventTypes).sort()).toEqual([...new Set(runtimeTypes)].sort());
  });
  it("rejects deleted tasks and keeps widget types exhaustive at runtime", () => {
    expect(() => assertCoverageShape()).not.toThrow();
    expect(RETAINED_TASKS).not.toContain("13");
    expect(Object.keys(coverage.widgetNodes).sort()).toEqual([...WIDGET_NODE_TYPES].sort());
  });
  it("reports status counts and todos", () => {
    const result = coverageSummary();
    expect(result.counts.todo).toBeGreaterThan(0);
    expect(result.todos.every((entry) => RETAINED_TASKS.includes(entry.task as (typeof RETAINED_TASKS)[number]))).toBe(true);
  });
});
