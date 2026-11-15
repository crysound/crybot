import { expect, it } from "vitest";
import { replaceFixtureSource } from "./fixture-source.ts";

it("rejects stale fixture instrumentation instead of silently running uninstrumented code", () => {
  expect(replaceFixtureSource("before needle after", "needle", "instrumented")).toBe("before instrumented after");
  expect(() => replaceFixtureSource("renamed code", "needle", "instrumented")).toThrow("Fixture source replacement did not match: needle");
});
