#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FORBIDDEN_NAMES = new Set([
  'TimelineView', 'Text', 'Image', 'Label', 'Link', 'Table', 'Section', 'Form', 'Group',
  'List', 'Menu', 'Toggle', 'Picker', 'Grid', 'Canvas', 'Layout', 'Gauge', 'ProgressView',
  'ShareLink', 'WebView', 'WebPage', 'Tab',
  'Data', 'Date', 'URL', 'Error', 'Result', 'Task', 'Notification', 'Operation', 'Timer',
  'Process', 'Thread',
  'LoginCookies', 'ServerAddress', 'WatchAPIError', 'WatchRequest', 'BotList', 'MessagePage',
  'SendMessage', 'SendResult', 'WatchBot', 'WatchCredentials', 'WatchMessage',
]);
const declarations = new Set(['struct', 'enum', 'class', 'actor', 'protocol', 'typealias']);
const importKinds = new Set([...declarations, 'func', 'var', 'let']);

function tokens(source) {
  const result = [];
  let index = 0;
  while (index < source.length) {
    if (/\s/.test(source[index])) { index++; continue; }
    if (source.startsWith('//', index)) {
      const end = source.indexOf('\n', index);
      index = end < 0 ? source.length : end;
      continue;
    }
    if (source.startsWith('/*', index)) {
      let depth = 1;
      index += 2;
      while (index < source.length && depth > 0) {
        if (source.startsWith('/*', index)) { depth++; index += 2; }
        else if (source.startsWith('*/', index)) { depth--; index += 2; }
        else index++;
      }
      continue;
    }
    const literal = /^(#*)("""|")/.exec(source.slice(index));
    if (literal) {
      const [, hashes, quotes] = literal;
      const end = quotes + hashes;
      const escape = '\\' + hashes;
      index += literal[0].length;
      while (index < source.length) {
        if (source.startsWith(escape, index)) { index += escape.length + 1; }
        else if (source.startsWith(end, index)) { index += end.length; break; }
        else index++;
      }
      continue;
    }
    const word = /^`[^`\r\n]+`|^[\p{L}\p{N}\p{M}_\u200c\u200d]+/u.exec(source.slice(index));
    const value = word ? word[0] : source[index];
    result.push({ text: value.replace(/^`|`$/g, ''), index });
    index += value.length;
  }
  return result;
}

export function checkSource(source, file = 'source.swift') {
  const items = tokens(source);
  const issues = [];
  const imports = new Map();
  const diagnostic = (token, message) => {
    const prefix = source.slice(0, token.index);
    const line = prefix.split('\n').length;
    const column = token.index - prefix.lastIndexOf('\n');
    return `${file}:${line}:${column}: error: ${message}`;
  };
  for (let index = 0; index < items.length; index++) {
    const token = items[index];
    if (token.text === 'import') {
      if (importKinds.has(items[index + 1]?.text)) index++;
      const module = items[++index];
      if (module) imports.set(module.text, module);
    } else if (declarations.has(token.text) && FORBIDDEN_NAMES.has(items[index + 1]?.text)) {
      const name = items[index + 1];
      issues.push(diagnostic(name, `forbidden type name ${name.text}`));
    }
  }
  if (imports.has('Markdown') && imports.has('SwiftUI')) {
    issues.push(diagnostic(imports.get('Markdown'), 'Markdown and SwiftUI must not be imported in the same file'));
  }
  return issues;
}

function swiftFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(entry => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return swiftFiles(file);
      return entry.isFile() && entry.name.endsWith('.swift') ? [file] : [];
    });
}

export function main(argv) {
  const defaultRoot = fileURLToPath(new URL('../../../', import.meta.url));
  if (argv.length && (argv.length !== 2 || argv[0] !== '--root')) {
    console.error('check-type-names.mjs:1: error: usage: check-type-names.mjs [--root repository]');
    return 2;
  }
  const root = path.resolve(argv[1] ?? defaultRoot);
  let count = 0;
  let failures = 0;
  for (const relative of ['mobile/ios/CryBot', 'mobile/ios/Packages/CryKit/Sources']) {
    try {
      for (const file of swiftFiles(path.join(root, relative))) {
        count++;
        const issues = checkSource(fs.readFileSync(file, 'utf8'), path.relative(root, file));
        for (const issue of issues) console.error(issue);
        failures += issues.length;
      }
    } catch (error) {
      console.error(`${relative}:1: error: ${error.message}`);
      failures++;
    }
  }
  console.log(`Type names: ${count} Swift files checked; ${failures} errors.`);
  return failures ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
