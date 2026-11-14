import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { interpolate, makeCatalog, generate } from './gen-strings.mjs';

const script = fileURLToPath(new URL('./gen-strings.mjs', import.meta.url));
const catalogs = new Map([
  ['en', { greeting: 'Hello {name}, {count}', missing: 'Only English' }],
  ['zh', { greeting: '共 {count}，你好 {name}' }],
  ['zh-tw', { greeting: '共 {count}，你好 {name}' }],
  ['pt-br', { greeting: '{count} para {name}' }],
]);
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cry-strings-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, data) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(data));
  };
  write('src/locales/en.json', { inbox: 'Inbox', 'chat.notice.test': '{name}: {count}', 'serverError.test': 'Failure {reason}' });
  write('src/locales/zh-tw.json', { inbox: '收件箱', 'chat.notice.test': '{count}：{name}' });
  write('src/locales/pt-br.json', { inbox: 'Inbox' });
  write('mobile/ios/CryBot/Features/Inbox/web-keys.json', ['inbox']);
  const run = (...args) => {
    const log = path.join(root, 'cli.log');
    const descriptor = fs.openSync(log, 'w');
    try {
      const result = spawnSync(process.execPath, [script, '--root', root, ...args], {
        stdio: ['ignore', descriptor, descriptor], env: { ...process.env, NODE_OPTIONS: '' }, cwd: os.tmpdir(),
      });
      assert.ifError(result.error);
      return { ...result, stderr: fs.readFileSync(log, 'utf8') };
    } finally {
      fs.closeSync(descriptor);
    }
  };
  return { root, write, run };
}
test('Web interpolation uses English positions, repeated names and escaped literal percents', () => {
  assert.equal(interpolate('Hello {name}'), 'Hello %1$@');
  assert.equal(interpolate('{count} for {{name}} ({count})'), '%1$@ for %2$@ (%1$@)');
  assert.equal(interpolate('{name} — {name}'), '%1$@ — %1$@');
  assert.equal(interpolate('100% {count}: {name}', '{name}: {count}'), '100%% %2$@: %1$@');
  assert.throws(() => interpolate('{unknown}', '{name}'), /Unknown placeholder/);
});
test('maps all renamed language codes and keeps English positions across languages', () => {
  const value = makeCatalog(['greeting', 'missing'], catalogs);
  assert.equal(value.strings.greeting.localizations.en.stringUnit.value, 'Hello %1$@, %2$@');
  assert.equal(value.strings.greeting.localizations['zh-Hans'].stringUnit.value, '共 %2$@，你好 %1$@');
  assert.equal(value.strings.greeting.localizations['zh-Hant'].stringUnit.value, '共 %2$@，你好 %1$@');
  assert.equal(value.strings.greeting.localizations['pt-BR'].stringUnit.value, '%2$@ para %1$@');
  assert.equal(value.strings.missing.localizations.en.stringUnit.value, 'Only English');
  assert.equal(value.strings.missing.localizations['zh-Hans'], undefined);
});
test('ServerText retains named placeholders across languages', () => {
  const value = makeCatalog(['greeting'], catalogs, { named: true });
  assert.equal(value.strings.greeting.localizations.en.stringUnit.value, 'Hello {name}, {count}');
  assert.equal(value.strings.greeting.localizations['zh-Hant'].stringUnit.value, '共 {count}，你好 {name}');
});
test('missing English key fails generation even if a translation exists', t => {
  const { write, run } = fixture(t);
  write('mobile/ios/CryBot/Features/Inbox/web-keys.json', ['missing']);
  write('src/locales/zh-tw.json', { missing: '翻譯' });
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing English key: missing/);
});
test('skips source-hashes.json, includes serverError and maps locale files', t => {
  const { root, write } = fixture(t);
  fs.writeFileSync(path.join(root, 'src/locales/source-hashes.json'), 'not locale JSON');
  write('src/locales/de.json', { inbox: 'Posteingang' });
  const outputs = generate(root);
  const web = JSON.parse(outputs.find(([file]) => file.endsWith('WebInbox.xcstrings'))[1]);
  assert.deepEqual(Object.keys(web.strings.inbox.localizations).sort(), ['de', 'en', 'pt-BR', 'zh-Hant']);
  const server = JSON.parse(outputs.find(([file]) => file.endsWith('ServerText.xcstrings'))[1]);
  assert.equal(server.strings['serverError.test'].localizations.en.stringUnit.value, 'Failure {reason}');
  assert.equal(server.strings['chat.notice.test'].localizations['zh-Hant'].stringUnit.value, '{count}：{name}');
});
test('--check fails for stale content and succeeds after regeneration', t => {
  const { root, run } = fixture(t);
  assert.equal(run().status, 0);
  assert.equal(run('--check').status, 0);
  fs.appendFileSync(path.join(root, 'mobile/ios/CryBot/Features/Inbox/WebInbox.xcstrings'), 'x');
  const check = run('--check');
  assert.equal(check.status, 1);
  assert.match(check.stderr, /run node mobile\/ios\/scripts\/gen-strings.mjs/);
  assert.equal(run().status, 0);
  assert.equal(run('--check').status, 0);
});
test('--check and generation only clean exactly named generated feature tables', t => {
  const { root, write, run } = fixture(t);
  assert.equal(run().status, 0);
  fs.unlinkSync(path.join(root, 'mobile/ios/CryBot/Features/Inbox/web-keys.json'));
  const handwritten = [
    'mobile/ios/CryBot/Features/WebHost/WebHost.xcstrings',
    'mobile/ios/CryBot/Features/WebHost/WebHostMenu.xcstrings',
    'mobile/ios/CryBot/Features/Inbox/Strings/WebInbox.xcstrings',
  ];
  for (const file of handwritten) write(file, { handwritten: file });
  assert.equal(run('--check').status, 1);
  assert.match(run('--check').stderr, /Stale output/);
  assert.doesNotMatch(run('--check').stderr, /WebHost|\/Strings\/WebInbox/);
  assert.equal(run().status, 0);
  assert.equal(run('--check').status, 0);
  assert.equal(fs.existsSync(path.join(root, 'mobile/ios/CryBot/Features/Inbox/WebInbox.xcstrings')), false);
  for (const file of handwritten) {
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, file))), { handwritten: file });
  }
});

test('ServerText includes all five production heldCode messages', () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const english = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/en.json'), 'utf8'));
  const keys = Object.keys(english).filter(key => key.startsWith('approval.held.')).sort();
  assert.deepEqual(keys, ['approval.held.native', 'approval.held.outbound', 'approval.held.sandbox',
    'approval.held.undelivered', 'approval.held.undeliveredFull']);
  const server = JSON.parse(generate(root).find(([file]) => file.endsWith('ServerText.xcstrings'))[1]);
  for (const key of keys) {
    assert.equal(server.strings[key].localizations.en.stringUnit.value, english[key]);
  }
});
