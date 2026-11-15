import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
import { checkSource, FORBIDDEN_NAMES } from './check-type-names.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const scripts = path.join(root, 'mobile/ios/scripts');

function capture(dir, command, args, options = {}) {
  const stdout = path.join(dir, 'stdout.log');
  const stderr = path.join(dir, 'stderr.log');
  const out = fs.openSync(stdout, 'w');
  const err = fs.openSync(stderr, 'w');
  try {
    const result = spawnSync(command, args, { ...options, timeout: 30000, stdio: ['ignore', out, err] });
    assert.ifError(result.error);
    return { ...result, stdout: fs.readFileSync(stdout, 'utf8'), stderr: fs.readFileSync(stderr, 'utf8') };
  } finally {
    fs.closeSync(out);
    fs.closeSync(err);
  }
}

test('rejects TimelineView with an exact source location', () => {
  assert.deepEqual(checkSource('import SwiftUI\nstruct TimelineView {}', 'Feature.swift'), [
    'Feature.swift:2:8: error: forbidden type name TimelineView',
  ]);
});

test('rejects every forbidden name for all six declarations, including escaped names', () => {
  for (const name of FORBIDDEN_NAMES) {
    for (const kind of ['struct', 'enum', 'class', 'actor', 'protocol', 'typealias']) {
      assert.match(checkSource(`public ${kind} \`${name}\``)[0], new RegExp(`forbidden type name ${name}$`));
    }
  }
});

test('rejects Markdown and SwiftUI together, including attributed and scoped imports', () => {
  for (const source of [
    'import Markdown\nimport SwiftUI',
    '@preconcurrency import SwiftUI\nimport struct Markdown.Text',
    'import\nMarkdown; @_exported import SwiftUI',
    '#if os(iOS)\nimport SwiftUI\n#else\nimport Markdown\n#endif',
  ]) {
    const issues = checkSource(source);
    assert.equal(issues.length, 1);
    assert.match(issues[0], /Markdown and SwiftUI must not be imported in the same file/);
  }
});

test('allows references, scoped imports, safe names and separate Markdown files', () => {
  assert.deepEqual(checkSource(`
    import struct Foundation.Date
    import class Foundation.Operation
    import SwiftUI
    struct ThreadTimelineView { let value: Date; let text: Text }
    typealias SendResponse = String
    enum CryServer {}
    struct TextModel {}
    struct Text数据 {}
  `), []);
  assert.deepEqual(checkSource('import Markdown\nstruct MarkdownBlock {}'), []);
});

test('ignores line comments, nested block comments and normal, raw and multiline strings', () => {
  assert.deepEqual(checkSource(`
    // struct TimelineView {}
    /* outer /* enum SendResult {} */ import SwiftUI */
    let a = "struct Text {}"
    let b = #"import Markdown; class Image {}"#
    let c = """
    protocol ServerAddress {}
    import SwiftUI
    """
    let d = ##"""
    "enum Data {}" #"typealias Task = String"#
    """##
    import Markdown
    struct /* nested /* gap */ gap */ CryBlock {}
  `), []);
  assert.match(checkSource('/* struct Text {} */\nstruct /* gap */\nTimelineView {}')[0], /source.swift:3:1:/);
});

function fixture(t) {
  const parent = path.join(root, 'mobile/ios/.linux-cache/test-fixtures');
  fs.mkdirSync(parent, { recursive: true });
  const dir = fs.mkdtempSync(path.join(parent, 'linux-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (file, content, mode) => {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, { mode });
  };
  for (const name of ['linux-test.sh', 'linux-check.sh', 'check-type-names.mjs']) {
    write(`mobile/ios/scripts/${name}`, fs.readFileSync(path.join(scripts, name)));
  }
  write('mobile/ios/CryBot/Features/One/Logic/First.swift', 'struct First {}');
  write('mobile/ios/CryBot/Features/One/Logic/Second.swift', 'struct Second { let value: First }');
  write('mobile/ios/CryBot/Features/Two/Logic/Other File.swift', 'struct Other {}');
  write('mobile/ios/Packages/CryKit/Sources/CryCore/Core.swift', 'struct CryRecord {}');
  write('mobile/ios/Packages/CryKit/Package.swift', '// fixture manifest');
  write('mobile/ios/CryBotWatch/Watch.swift', 'struct WatchFixture {}');
  write('mobile/ios/Packages/CryKit/Tests/CryNetTests/Test.swift', 'struct TestFixture {}');
  write('mobile/ios/.linux-build/Generated.swift', 'invalid generated code');
  write('mobile/ios/scripts/gen-strings.mjs', 'console.log("strings check reached"); process.exitCode = Number(process.env.STRINGS_STATUS ?? 0);');
  const bin = path.join(dir, 'bin');
  const calls = path.join(dir, 'calls.jsonl');
  const tool = `#!${process.execPath}
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const name = path.basename(process.argv[1]);
fs.appendFileSync(process.env.CALLS, JSON.stringify({ name, args, env: Object.fromEntries(['HOME', 'XDG_CACHE_HOME', 'CLANG_MODULE_CACHE_PATH', 'SWIFTPM_MODULECACHE_OVERRIDE', 'TMPDIR'].map(key => [key, process.env[key]])) }) + '\\n');
if (name === 'swift' && args[0] === 'test') process.exit(Number(process.env.TEST_STATUS ?? 0));
const binPath = path.join(process.env.FIXTURE, 'mobile/ios/.linux-build', process.env.BUILD_LAYOUT ?? 'debug');
if (args.includes('--show-bin-path')) {
  console.log(binPath);
} else if (name === 'swift') {
  if (process.env.BUILD_FAIL) process.exit(1);
  if (process.env.MODULE_MISSING) process.exit(0);
  const modules = path.join(binPath, 'Modules');
  fs.mkdirSync(modules, { recursive: true });
  const module = path.join(modules, 'CryCore.swiftmodule');
  if (process.env.MODULE_DIRECTORY) {
    fs.mkdirSync(module, { recursive: true });
    fs.writeFileSync(path.join(module, 'x86_64-unknown-linux-gnu.swiftmodule'), 'fixture');
  } else {
    fs.writeFileSync(module, 'fixture');
  }
} else if ((args.includes('-parse') && process.env.PARSE_FAIL && args.some(a => a.endsWith('Watch.swift')))
  || (args.includes('-typecheck') && process.env.TYPE_FAIL)) {
  console.error(args.at(-1) + ':3:2: error: fixture diagnostic');
  process.exit(1);
}
`;
  write('bin/package.json', '{"type":"module"}');
  write('bin/swift', tool, 0o755);
  write('bin/swiftc', tool, 0o755);
  const run = (name, env = {}, args = []) => {
    fs.writeFileSync(calls, '');
    const result = capture(dir, '/bin/bash', [path.join(dir, 'mobile/ios/scripts', name), ...args], {
      cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`,
        FIXTURE: dir, CALLS: calls, ...env },
    });
    assert.ifError(result.error);
    return { status: result.status, log: result.stdout + result.stderr,
      calls: fs.readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) };
  };
  return { dir, bin, write, run };
}

test('CLI scans both trees recursively and returns failure with the file and line', t => {
  const { dir, write } = fixture(t);
  write('mobile/ios/Packages/CryKit/Sources/CryCore/Nested/Bad.swift', '\nstruct TimelineView {}');
  write('mobile/ios/CryBot/Features/One/Bad.swift', 'import Markdown\nimport SwiftUI');
  const result = capture(dir, process.execPath, [path.join(scripts, 'check-type-names.mjs'), '--root', dir], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Nested\/Bad.swift:2:8: error: forbidden type name TimelineView/);
  assert.match(result.stderr, /Features\/One\/Bad.swift:1:8: error: Markdown and SwiftUI/);
  assert.match(result.stdout, /6 Swift files checked; 2 errors/);
  fs.rmSync(path.join(dir, 'mobile/ios/Packages/CryKit/Sources'), { recursive: true });
  const missing = capture(dir, process.execPath, [path.join(scripts, 'check-type-names.mjs'), '--root', dir], { encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Sources:1: error:/);
});

test('linux-test isolates all Swift caches and propagates test failures without filtering targets', t => {
  const { dir, run } = fixture(t);
  const result = run('linux-test.sh', { TEST_STATUS: '7' });
  assert.equal(result.status, 7);
  assert.equal(result.calls.length, 1);
  const call = result.calls[0];
  assert.equal(call.args[0], 'test');
  for (const key of ['HOME', 'XDG_CACHE_HOME', 'CLANG_MODULE_CACHE_PATH', 'SWIFTPM_MODULECACHE_OVERRIDE', 'TMPDIR']) {
    assert.ok(call.env[key].startsWith(`${dir}/mobile/ios/.linux-cache/`), key);
  }
  for (const flag of ['--scratch-path', '--cache-path', '--config-path', '--security-path']) {
    assert.ok(call.args[call.args.indexOf(flag) + 1].startsWith(`${dir}/mobile/ios/.linux-`), flag);
  }
  assert.equal(call.args[call.args.indexOf('--package-path') + 1], `${dir}/mobile/ios/Packages/CryKit`);
  assert.equal(call.args[call.args.indexOf('--build-system') + 1], 'native');
  assert.ok(!call.args.includes('--filter'));
  assert.ok(!call.args.includes('--skip'));
});

test('both scripts explain missing Swift and exit 2', t => {
  const { bin, run } = fixture(t);
  fs.unlinkSync(path.join(bin, 'swift'));
  fs.symlinkSync('/usr/bin/dirname', path.join(bin, 'dirname'));
  for (const name of ['linux-test.sh', 'linux-check.sh']) {
    const result = run(name, { PATH: bin });
    assert.equal(result.status, 2, result.log);
    assert.match(result.log, /Swift is missing from PATH/);
    assert.equal(result.calls.length, 0);
  }
});

test('linux-check parses all source trees, groups logic files and imports the freshly built module', t => {
  const { dir, run } = fixture(t);
  const result = run('linux-check.sh');
  assert.equal(result.status, 0, result.log);
  const parses = result.calls.filter(call => call.args.includes('-parse'));
  assert.equal(parses.length, 7);
  assert.ok(parses.some(call => call.args.at(-1).endsWith('CryNetTests/Test.swift')));
  assert.ok(parses.every(call => !call.args.at(-1).includes('.linux-build')));
  const checks = result.calls.filter(call => call.args.includes('-typecheck'));
  assert.equal(checks.length, 2);
  assert.deepEqual(checks[0].args.slice(-2), [
    'mobile/ios/CryBot/Features/One/Logic/First.swift', 'mobile/ios/CryBot/Features/One/Logic/Second.swift',
  ]);
  assert.equal(checks[0].args[checks[0].args.indexOf('-I') + 1], `${dir}/mobile/ios/.linux-build/debug/Modules`);
  assert.match(result.log, /7 Swift files parsed; 2 Logic directories \(3 files\) typechecked; 0 failed checks/);
  assert.match(result.log, /strings check reached/);
});

test('linux-check aggregates syntax, logic, naming and strings failures with diagnostics', t => {
  const { write, run } = fixture(t);
  write('mobile/ios/CryBot/Bad.swift', 'struct TimelineView {}');
  const result = run('linux-check.sh', { PARSE_FAIL: '1', TYPE_FAIL: '1', STRINGS_STATUS: '1' });
  assert.equal(result.status, 1);
  assert.match(result.log, /Watch.swift:3:2: error: fixture diagnostic/);
  assert.match(result.log, /Bad.swift:1:8: error: forbidden type name TimelineView/);
  assert.match(result.log, /gen-strings.mjs:1: error: check failed/);
  assert.match(result.log, /5 failed checks/);
  assert.match(result.log, /strings check reached/);
});

const moduleLayouts = [
  { BUILD_LAYOUT: 'debug' },
  { BUILD_LAYOUT: 'out/Products/Debug-linux-x86_64', MODULE_DIRECTORY: '1' },
];

test('linux-check imports a directory module from the new SwiftPM product layout', t => {
  const { dir, run } = fixture(t);
  const result = run('linux-check.sh', moduleLayouts[1]);
  assert.equal(result.status, 0, result.log);
  const modules = path.join(dir, 'mobile/ios/.linux-build/out/Products/Debug-linux-x86_64/Modules');
  assert.ok(fs.statSync(path.join(modules, 'CryCore.swiftmodule')).isDirectory());
  const checks = result.calls.filter(call => call.args.includes('-typecheck'));
  assert.equal(checks.length, 2);
  for (const check of checks) assert.equal(check.args[check.args.indexOf('-I') + 1], modules);
  assert.match(result.log, /2 Logic directories \(3 files\) typechecked; 0 failed checks/);
});

for (const layout of moduleLayouts) {
  test(`a missing CryCore module fails without using another build layout: ${layout.BUILD_LAYOUT}`, t => {
    const { write, run } = fixture(t);
    write('mobile/ios/.linux-build/stale/Modules/CryCore.swiftmodule', 'stale module');
    const result = run('linux-check.sh', { ...layout, MODULE_MISSING: '1' });
    assert.equal(result.status, 1, result.log);
    assert.equal(result.calls.filter(call => call.args.includes('-typecheck')).length, 0);
    assert.ok(result.log.includes(`${layout.BUILD_LAYOUT}/Modules/CryCore.swiftmodule:1: error: CryCore module is missing`));
    assert.match(result.log, /Type names:/);
    assert.match(result.log, /strings check reached/);
    assert.match(result.log, /1 failed checks/);
  });

  test(`a failed CryCore build never uses stale modules: ${layout.BUILD_LAYOUT}`, t => {
    const { run } = fixture(t);
    assert.equal(run('linux-check.sh', layout).status, 0);
    const result = run('linux-check.sh', { ...layout, BUILD_FAIL: '1' });
    assert.equal(result.status, 1);
    assert.equal(result.calls.filter(call => call.args.includes('-typecheck')).length, 0);
    assert.match(result.log, /Package.swift:1: error: check failed/);
    assert.match(result.log, /Type names:/);
    assert.match(result.log, /strings check reached/);
  });
}

test('empty feature Logic trees are explicitly counted', t => {
  const { dir, run } = fixture(t);
  fs.rmSync(path.join(dir, 'mobile/ios/CryBot/Features'), { recursive: true });
  const result = run('linux-check.sh');
  assert.equal(result.status, 0, result.log);
  assert.match(result.log, /0 Logic directories \(0 files\) typechecked/);
});

test('iOS Linux workflow selects relevant PRs and executes both scripts and all Node tests', () => {
  const workflow = YAML.parse(fs.readFileSync(path.join(root, '.github/workflows/ios-linux.yml'), 'utf8'));
  assert.equal(workflow.name, 'iOS Linux');
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  for (const job of Object.values(workflow.jobs)) {
    for (const entry of [job, ...(job.steps ?? [])]) {
      if ('uses' in entry) assert.match(entry.uses, /^[^@\s]+@[0-9a-fA-F]{40}$/);
    }
  }
  for (const glob of ['mobile/ios/**', 'shared/**', 'src/locales/**', '.github/workflows/ios-linux.yml']) {
    assert.ok(workflow.on.pull_request.paths.includes(glob));
  }
  assert.match(workflow.jobs.linux['runs-on'], /^ubuntu-/);
  const commands = workflow.jobs.linux.steps.filter(step => step.run).map(step => step.run);
  for (const command of ['swift --version', 'mobile/ios/scripts/linux-test.sh', 'mobile/ios/scripts/linux-check.sh',
    'node --test mobile/ios/scripts/*.test.mjs']) assert.ok(commands.includes(command));
  for (const command of commands) {
    assert.equal(spawnSync('/bin/bash', ['-n', '-c', command], { stdio: 'ignore', timeout: 30000 }).status, 0);
  }
});
