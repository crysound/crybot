#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LANGUAGE_CODES = {
  de: 'de', en: 'en', es: 'es', fr: 'fr', hi: 'hi', it: 'it', ja: 'ja', ko: 'ko',
  pl: 'pl', 'pt-br': 'pt-BR', ru: 'ru', tr: 'tr', uk: 'uk', vi: 'vi', zh: 'zh-Hans', 'zh-tw': 'zh-Hant',
};

export function interpolate(value) {
  if (typeof value !== 'string') return value;
  const matches = [...value.matchAll(/\{\{?([A-Za-z0-9_.-]+)\}?\}/g)];
  const names = [...new Set(matches.map(match => match[1]))];
  return value.replace(/\{\{?([A-Za-z0-9_.-]+)\}?\}/g, (_, name) =>
    matches.length === 1 ? '%@' : `%${names.indexOf(name) + 1}$@`);
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function localeFiles(root) {
  const dir = path.join(root, 'src/locales');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(name => name.endsWith('.json') && name !== 'source-hashes.json')
    .filter(name => LANGUAGE_CODES[name.slice(0, -5).toLowerCase()]);
}
function localeCatalog(root) {
  const catalogs = new Map();
  for (const file of localeFiles(root)) {
    const stem = file.slice(0, -5).toLowerCase();
    catalogs.set(stem, readJson(path.join(root, 'src/locales', file)));
  }
  return catalogs;
}
function featureKeys(root) {
  const dir = path.join(root, 'mobile/ios/CryBot/Features');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory()).flatMap(entry => {
    const keysFile = path.join(dir, entry.name, 'web-keys.json');
    if (!fs.existsSync(keysFile)) return [];
    const keys = readJson(keysFile);
    if (!Array.isArray(keys) || keys.some(key => typeof key !== 'string')) throw new Error(`${keysFile} must contain a string array`);
    return [{ name: entry.name, keys }];
  });
}
function serverKeys(root, catalogs) {
  const file = path.join(root, 'shared/server-text.ts');
  const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const candidates = new Set(['chat.notice', 'routines.server']);
  for (const match of source.matchAll(/["'`]([A-Za-z][A-Za-z0-9_.-]*\.[A-Za-z0-9_.-]+)["'`]/g)) candidates.add(match[1]);
  const english = catalogs.get('en') ?? {};
  return Object.keys(english).filter(key => [...candidates].some(prefix => key === prefix || key.startsWith(`${prefix}.`)));
}

export function makeCatalog(keys, catalogs) {
  const strings = {};
  for (const key of [...new Set(keys)].sort()) {
    const localizations = {};
    for (const [stem, catalog] of catalogs) {
      if (!Object.hasOwn(catalog, key) || typeof catalog[key] !== 'string') continue;
      localizations[LANGUAGE_CODES[stem]] = { stringUnit: { state: 'translated', value: interpolate(catalog[key]) } };
    }
    strings[key] = { extractionState: 'manual', localizations };
  }
  return { sourceLanguage: 'en', strings, version: '1.0' };
}

function encode(catalog) { return `${JSON.stringify(catalog, null, 2)}\n`; }
export function generate(root) {
  const catalogs = localeCatalog(root);
  const outputs = [];
  for (const feature of featureKeys(root)) {
    outputs.push([path.join(root, 'mobile/ios/CryBot/Features', feature.name, `Web${feature.name}.xcstrings`), encode(makeCatalog(feature.keys, catalogs))]);
  }
  outputs.push([path.join(root, 'mobile/ios/CryBot/Strings/ServerText.xcstrings'), encode(makeCatalog(serverKeys(root, catalogs), catalogs))]);
  return outputs;
}

export function main(argv) {
  const check = argv.includes('--check');
  const rootIndex = argv.indexOf('--root');
  const rootArg = rootIndex >= 0 ? argv[rootIndex + 1] : undefined;
  const root = path.resolve(rootArg ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  let changed = false;
  for (const [file, content] of generate(root)) {
    const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (existing !== content) {
      changed = true;
      if (check) console.error(`Out of date: ${path.relative(root, file)}; run node mobile/ios/scripts/gen-strings.mjs to update.`);
      else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); }
    }
  }
  if (check && changed) process.exitCode = 1;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'gen-strings.mjs') main(process.argv.slice(2));
