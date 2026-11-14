import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import ts from "@typescript/typescript6";

export function channelsIn(source, file = "fixture.mjs") {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const channels = [];
  const values = (node, bindings) => {
    if (ts.isStringLiteralLike(node)) return [node.text];
    if (ts.isIdentifier(node)) return bindings.get(node.text) ?? [];
    if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(value => values(value, bindings));
    if (ts.isTemplateExpression(node)) {
      let expanded = [node.head.text];
      for (const span of node.templateSpans) expanded = expanded.flatMap(prefix => values(span.expression, bindings).map(value => prefix + value + span.literal.text));
      return expanded;
    }
    return [];
  };
  const wrappers = new Map();
  function walk(node, bindings = new Map()) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const found = values(node.initializer, bindings);
      if (found.length) bindings.set(node.name.text, found);
      if (ts.isArrowFunction(node.initializer)) {
        let registration;
        const find = child => {
          if (ts.isCallExpression(child) && /^ipcMain\.(handle|on)$/.test(child.expression.getText(tree))) registration = child;
          ts.forEachChild(child, find);
        };
        find(node.initializer.body);
        if (registration) wrappers.set(node.name.text, { parameters: node.initializer.parameters, channel: registration.arguments[0] });
      }
    }
    if (ts.isForOfStatement(node) && ts.isVariableDeclarationList(node.initializer)) {
      const nested = new Map(bindings);
      const binding = node.initializer.declarations[0].name;
      if (ts.isArrayBindingPattern(binding) && ts.isArrayLiteralExpression(node.expression)) {
        binding.elements.forEach((element, index) => {
          if (ts.isBindingElement(element)) nested.set(element.name.getText(tree), node.expression.elements.flatMap(row => ts.isArrayLiteralExpression(row) && row.elements[index] ? values(row.elements[index], bindings) : []));
        });
      } else nested.set(binding.getText(tree), values(node.expression, bindings));
      walk(node.statement, nested);
      return;
    }
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(tree);
      let expanded = [];
      if (/^ipcMain\.(handle|on)$/.test(name)) expanded = values(node.arguments[0], bindings);
      else if (wrappers.has(name)) {
        const wrapper = wrappers.get(name), nested = new Map(bindings);
        wrapper.parameters.forEach((parameter, index) => nested.set(parameter.name.getText(tree), node.arguments[index] ? values(node.arguments[index], bindings) : []));
        expanded = values(wrapper.channel, nested);
      }
      for (const channel of expanded) channels.push({ channel, file, line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1 });
    }
    ts.forEachChild(node, child => walk(child, bindings));
  }
  walk(tree);
  return channels;
}

test("expands method lists and registration wrappers", () => {
  assert.deepEqual(channelsIn('for (const method of ["state", "begin"]) { ipcMain.handle(`account:${method}`, run); } ipcMain.on("account:state", run);').map(item => item.channel), ["account:state", "account:begin", "account:state"]);
  assert.deepEqual(channelsIn('for (const [channel, act] of [["window:close", close], ["window:minimize", minimize]]) { ipcMain.handle(channel, act); }').map(item => item.channel), ["window:close", "window:minimize"]);
  assert.deepEqual(channelsIn('const handle = (method, run) => ipcMain.handle(`account:${method}`, run); handle("state", run);').map(item => item.channel), ["account:state"]);
});

test("Electron IPC channel registrations are unique", async () => {
  const directory = new URL("./", import.meta.url);
  const files = (await readdir(directory)).filter(file => file.endsWith(".mjs") && !/\.(?:node-test|test)\.mjs$/.test(file));
  const registrations = (await Promise.all(files.map(async file => channelsIn(await readFile(new URL(file, directory), "utf8"), file)))).flat();
  assert.ok(registrations.length > 50);
  const seen = new Map(), duplicates = [];
  for (const item of registrations) {
    if (seen.has(item.channel)) duplicates.push([seen.get(item.channel), item]);
    else seen.set(item.channel, item);
  }
  assert.deepEqual(duplicates, []);
});
