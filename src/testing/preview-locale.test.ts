// @vitest-environment happy-dom
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import ts from "@typescript/typescript6";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("../lib/i18n");
  vi.resetModules();
  window.history.replaceState(null, "", "/");
});

it.each(["en", "zh"])("waits for %s before allowing preview rendering", async (tag) => {
  vi.resetModules();
  let arrive!: () => void;
  const loadLocale = vi.fn(() => new Promise<string>((resolve) => { arrive = () => resolve(tag); }));
  vi.doMock("../lib/i18n", () => ({ loadLocale }));
  const { preparePreviewLocale } = await import("./preview-locale");
  window.history.replaceState(null, "", tag === "en" ? "/" : "/?lang=zh");
  const render = vi.fn();
  const loading = preparePreviewLocale().then(render);
  await Promise.resolve();
  expect(loadLocale).toHaveBeenCalledWith(tag);
  expect(render).not.toHaveBeenCalled();
  arrive();
  await loading;
  expect(render).toHaveBeenCalledWith(tag);
});

it("awaits locale readiness in every standalone preview entry before creating a root", () => {
  const entries = ["src", "src/testing", "scripts/testing"].flatMap((folder) =>
    readdirSync(folder).filter((file) => file.endsWith(".tsx") && !["main.tsx", "rail.tsx", "island.tsx"].includes(file))
      .map((file) => resolve(folder, file)))
    .filter((file) => /import\s*\{[^}]*createRoot[^}]*\}\s*from\s*["']react-dom\/client["']/.test(readFileSync(file, "utf8")));
  expect(entries).toHaveLength(34);
  for (const file of entries) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let readyAt = Infinity;
    const rootCalls: number[] = [];
    for (const statement of source.statements) {
      if (ts.isExpressionStatement(statement) && ts.isAwaitExpression(statement.expression)) {
        const call = statement.expression.expression;
        if (ts.isCallExpression(call) && call.expression.getText(source) === "preparePreviewLocale") readyAt = statement.pos;
      }
    }
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.getText(source) === "createRoot") rootCalls.push(node.pos);
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(rootCalls.length, file).toBeGreaterThan(0);
    for (const position of rootCalls) expect(readyAt, file).toBeLessThan(position);
  }
});
