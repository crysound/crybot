import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { interpolate, makeCatalog } from './gen-strings.mjs';

const catalogs = new Map([
  ['en', { greeting: 'Hello {name}, {count}', missing: 'Only English' }],
  ['zh', { greeting: '你好 {name}，共 {count}' }],
]);
test('converts interpolation and preserves parameter order', () => {
  assert.equal(interpolate('Hello {name}'), 'Hello %@');
  assert.equal(interpolate('{count} for {name} ({count})'), '%1$@ for %2$@ (%1$@)');
  assert.equal(interpolate('{name} — {name}'), '%1$@ — %1$@');
});
test('maps language codes and omits missing translations', () => {
  const value = makeCatalog(['greeting', 'missing'], catalogs);
  assert.equal(value.strings.greeting.localizations['zh-Hans'].stringUnit.value, '你好 %1$@，共 %2$@');
  assert.equal(value.strings.missing.localizations.en.stringUnit.value, 'Only English');
  assert.equal(value.strings.missing.localizations['zh-Hans'], undefined);
});
test('--check fails for stale output', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cry-strings-'));
  fs.mkdirSync(path.join(root, 'src/locales'), { recursive: true });
  fs.mkdirSync(path.join(root, 'mobile/ios/CryBot/Features/Inbox'), { recursive: true });
  fs.mkdirSync(path.join(root, 'mobile/ios/CryBot/Strings'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/locales/en.json'), JSON.stringify({ inbox: 'Inbox' }));
  fs.writeFileSync(path.join(root, 'src/locales/zh.json'), JSON.stringify({ inbox: '收件箱' }));
  fs.writeFileSync(path.join(root, 'mobile/ios/CryBot/Features/Inbox/web-keys.json'), '["inbox"]');
  fs.mkdirSync(path.join(root, 'shared'), { recursive: true }); fs.writeFileSync(path.join(root, 'shared/server-text.ts'), '');
  const script = path.resolve('mobile/ios/scripts/gen-strings.mjs');
  const childEnv = { ...process.env, NODE_OPTIONS: '' };
  const first = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8', env: childEnv });
  assert.equal(first.status, 0);
  fs.appendFileSync(path.join(root, 'mobile/ios/CryBot/Features/Inbox/WebInbox.xcstrings'), 'x');
  const check = spawnSync(process.execPath, [script, '--root', root, '--check'], { encoding: 'utf8', env: childEnv });
  assert.equal(check.status, 1);
});
