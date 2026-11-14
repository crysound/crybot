import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const mobile = YAML.parse(fs.readFileSync(path.join(root, '.github/workflows/mobile.yml'), 'utf8'));
const nightly = YAML.parse(fs.readFileSync(path.join(root, '.github/workflows/ios-nightly.yml'), 'utf8'));
const project = YAML.parse(fs.readFileSync(path.join(root, 'mobile/ios/project.yml'), 'utf8'));
const step = (job, name) => job.steps.find(item => item.name === name);
const selection = step(mobile.jobs.ios, 'Select iOS test scope').run;
const flows = step(mobile.jobs.ios, 'Run selected XCUITest flows').run;

test('the app keeps its Swift module name when the display product name has spaces', () => {
  assert.equal(project.targets.CryBot.settings.base.PRODUCT_MODULE_NAME, 'CryBot');
});

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cry-workflows-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const scripts = path.join(dir, 'mobile/ios/scripts');
  fs.mkdirSync(scripts, { recursive: true });
  for (const file of ['ui-test-selection.sh', 'assert-tests-ran.sh']) {
    fs.copyFileSync(path.join(root, 'mobile/ios/scripts', file), path.join(scripts, file));
  }
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  const writeTool = (name, source) => fs.writeFileSync(path.join(bin, name), '#!/usr/bin/env bash\nset -euo pipefail\n' + source, { mode: 0o755 });
  writeTool('git', 'printf "%s\\n" "$CHANGED_PATH"\n');
  writeTool('xcodebuild', 'printf "%s\\n" "$*" >> "$CALLS"\n[[ "$*" != *"id=fail-device"* ]]\n');
  writeTool('xcrun', 'printf \'%s\\n\' "${SUMMARY_JSON}"\n');
  const envFile = path.join(dir, 'github-env');
  const calls = path.join(dir, 'calls');
  const run = (source, env = {}, args = []) => {
    fs.writeFileSync(envFile, '');
    fs.writeFileSync(calls, '');
    const script = path.join(dir, 'step.sh');
    fs.writeFileSync(script, source.replace(/\$\{\{.*?\}\}/g, 'fixture-base'));
    const log = path.join(dir, 'log');
    const descriptor = fs.openSync(log, 'w');
    try {
      const result = spawnSync('bash', ['-eo', 'pipefail', ...args, script], {
        cwd: path.join(dir, 'mobile/ios'), stdio: ['ignore', descriptor, descriptor],
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: dir, GITHUB_ENV: envFile,
          CALLS: calls, SUMMARY_JSON: '{"passedTests":1,"skippedTests":0}',
          CRYBOT_TEST_SIMULATOR: 'fixture-device', CRYBOT_UI_ONLY_TESTING: '', ...env },
      });
      assert.ifError(result.error);
      return { status: result.status, log: fs.readFileSync(log, 'utf8'),
        calls: fs.readFileSync(calls, 'utf8'), env: fs.readFileSync(envFile, 'utf8') };
    } finally { fs.closeSync(descriptor); }
  };
  return { dir, scripts, run, writeTool };
}

test('workflow YAML and every embedded shell script parse', t => {
  const { run } = fixture(t);
  for (const workflow of [mobile, nightly]) {
    for (const job of Object.values(workflow.jobs)) {
      for (const item of job.steps.filter(item => item.run)) {
        const result = run(item.run, {}, ['-n']);
        assert.equal(result.status, 0, `${item.name}: ${result.log}`);
      }
    }
  }
});

test('main push uses none; manual main and other push use all; PR logs both scope lines', t => {
  const { run } = fixture(t);
  for (const [event, ref, expected] of [
    ['push', 'refs/heads/main', 'none'], ['workflow_dispatch', 'refs/heads/main', 'all'],
    ['push', 'refs/heads/fixture', 'all'], ['pull_request', 'refs/pull/1/merge', 'all'],
  ]) {
    const result = run(selection, { GITHUB_EVENT_NAME: event, GITHUB_REF: ref,
      CHANGED_PATH: 'mobile/ios/CryBot/Strings/ServerTextRenderer.swift' });
    assert.equal(result.status, 0, result.log);
    assert.match(result.env, new RegExp(`CRYBOT_SNAPSHOT_FEATURES=${expected}\\n`));
    assert.match(result.log, new RegExp(`snapshot features: ${expected}\\nXCUITest arguments: \\n`));
  }
});

test('selection script failure fails the workflow step without publishing empty selection', t => {
  const { scripts, run } = fixture(t);
  fs.writeFileSync(path.join(scripts, 'ui-test-selection.sh'), '#!/usr/bin/env bash\nexit 7\n');
  const result = run(selection, { GITHUB_EVENT_NAME: 'pull_request', CHANGED_PATH: 'fixture' });
  assert.equal(result.status, 7);
  assert.equal(result.env, '');
});

test('PR with no selected feature publishes none, including an empty script result', t => {
  const { scripts, run, writeTool } = fixture(t);
  writeTool('git', '[[ "$1" == -c && "$2" == core.quotePath=false && "$3" == diff && "$4" == --name-only ]]\nprintf "%s\\n" "$CHANGED_PATH"\n');
  const env = { GITHUB_EVENT_NAME: 'pull_request', CHANGED_PATH: 'docs/readme.md' };
  const result = run(selection, env);
  assert.equal(result.status, 0, result.log);
  assert.equal(result.env, 'CRYBOT_SNAPSHOT_FEATURES=none\nCRYBOT_UI_ONLY_TESTING=\n');
  fs.writeFileSync(path.join(scripts, 'ui-test-selection.sh'), '#!/usr/bin/env bash\nprintf "\\n\\n"\n');
  assert.equal(run(selection, env).env, result.env);
});

test('real git diff preserves spaces and Unicode paths for PR selection', t => {
  for (const [file, expected] of [
    ['mobile/ios/CryBot/Features/Inbox/子目录/View with spaces.swift', 'Inbox'],
    ['mobile/ios/CryBot/Features/收件箱/View.swift', 'all'],
    ['mobile/ios/CryBot/Features/Two Words/View.swift', 'all'],
  ]) {
    const { dir, run } = fixture(t);
    fs.rmSync(path.join(dir, 'bin/git'));
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), 'fixture');
    for (const args of [['init', '-q'], ['config', 'core.quotePath', 'true'], ['add', '--', file]]) {
      const result = spawnSync('git', ['-C', dir, ...args], { stdio: 'ignore' });
      assert.ifError(result.error);
      assert.equal(result.status, 0);
    }
    const source = selection.replace('"${{ github.event.pull_request.base.sha }}" HEAD', '--cached');
    const result = run(source, { GITHUB_EVENT_NAME: 'pull_request' });
    assert.equal(result.status, 0, result.log);
    assert.match(result.env, new RegExp(`CRYBOT_SNAPSHOT_FEATURES=${expected}\\n`));
  }
});

test('all runs the full UI target; selected flows run; only empty/none scope skips', t => {
  const { run } = fixture(t);
  for (const [features, args, expected] of [
    ['all', '', '-only-testing:CryBotUITests'],
    ['Chat', '-only-testing:CryBotUITests/ChatFlowTests', '-only-testing:CryBotUITests/ChatFlowTests'],
    ['Inbox', '', '-only-testing:CryBotUITests/HarnessFlowTests'],
    ['', '', ''], ['none', '', ''],
  ]) {
    const result = run(flows, { CRYBOT_SNAPSHOT_FEATURES: features, CRYBOT_UI_ONLY_TESTING: args });
    assert.equal(result.status, 0, result.log);
    if (expected) {
      assert.equal(result.calls.match(/-only-testing:\S+/)?.[0], expected);
      assert.match(result.log, /1 tests executed; 0 tests skipped/);
    } else assert.equal(result.calls, '');
  }
});

test('a missing or entirely skipped UI class fails the required guard', t => {
  const { run } = fixture(t);
  for (const summary of ['{"totalTestCount":0}', '{"totalTestCount":1,"skippedTests":1}']) {
    const result = run(flows, { CRYBOT_SNAPSHOT_FEATURES: 'Chat',
      CRYBOT_UI_ONLY_TESTING: '-only-testing:CryBotUITests/NonexistentFlowTests', SUMMARY_JSON: summary });
    assert.equal(result.status, 1);
    assert.match(result.log, /Selected tests did not execute/);
  }
});

test('nightly tries all three destinations before returning failure', t => {
  const { run } = fixture(t);
  const result = run(step(nightly.jobs.nightly, 'Run all XCUITest flows on three devices').run, {
    CRYBOT_NIGHTLY_16: 'fail-device', CRYBOT_NIGHTLY_SE: 'se-device', CRYBOT_NIGHTLY_PROMAX: 'max-device',
  });
  assert.equal(result.status, 1);
  assert.equal(result.calls.trim().split('\n').length, 3);
  assert.match(result.calls, /id=se-device/);
  assert.match(result.calls, /id=max-device/);
  assert.equal((result.log.match(/1 tests executed/g) ?? []).length, 3);
});

test('nightly checks launch screenshots for all three devices even if snapshot export fails', t => {
  const { run, scripts, writeTool } = fixture(t);
  fs.writeFileSync(path.join(scripts, 'export-screenshots.sh'), '#!/usr/bin/env bash\nexit "${EXPORT_STATUS}"\n', { mode: 0o755 });
  writeTool('python3', 'printf "%s\\n" "$*" >> "$CALLS"\nexit "$LAUNCH_STATUS"\n');
  const source = step(nightly.jobs.nightly, 'Export and validate screenshots').run;
  for (const [exportStatus, launchStatus, expected] of [['0', '0', 0], ['1', '0', 1], ['0', '1', 1]]) {
    const result = run(source, { CRYBOT_SNAPSHOT_FEATURES: 'all',
      EXPORT_STATUS: exportStatus, LAUNCH_STATUS: launchStatus });
    assert.equal(result.status, expected, result.log);
    assert.equal(result.calls.trim(), 'scripts/assert-screenshots.py DerivedData/screenshots none --require-launch iPhone16 iPhoneSE iPhoneProMax');
  }
});

test('daily and weekly cron do not overlap; exports run after failures; artifact names differ', () => {
  assert.deepEqual(nightly.on.schedule.map(item => item.cron), ['17 19 * * 1-6', '17 19 * * 0']);
  assert.equal(nightly.jobs.nightly.if, undefined);
  assert.match(nightly.jobs['ios-18-weekly'].if, /17 19 \* \* 0/);
  const artifactNames = [];
  for (const job of [mobile.jobs.ios, ...Object.values(nightly.jobs)]) {
    const exportStep = job.steps.find(item => item.name?.startsWith('Export and validate'));
    assert.equal(exportStep.if, 'always()');
    assert.doesNotMatch(exportStep.run, /\|\| true/);
    const upload = job.steps.find(item => item.uses?.startsWith('actions/upload-artifact') && item.with.name.startsWith('ios-screenshots'));
    assert.equal(upload.with['if-no-files-found'], 'error');
    artifactNames.push(upload.with.name);
  }
  assert.deepEqual(artifactNames, ['ios-screenshots', 'ios-screenshots', 'ios-screenshots-ios18']);
});

test('iOS 18 downloads a concrete version only when no runtime is available', t => {
  const { run, writeTool } = fixture(t);
  writeTool('xcrun', 'printf \'%s\\n\' "$INVENTORY"\n');
  const source = step(nightly.jobs['ios-18-weekly'], 'Download iOS 18 runtime').run;
  const installed = run(source, { INVENTORY: JSON.stringify({ runtimes: [
    { identifier: 'fixture.iOS-18-6', version: '18.6', isAvailable: true },
  ] }) });
  assert.equal(installed.status, 0, installed.log);
  assert.equal(installed.calls, '');
  const missing = run(source, { INVENTORY: '{"runtimes":[]}' });
  assert.equal(missing.status, 0, missing.log);
  assert.equal(missing.calls.trim(), '-downloadPlatform iOS -buildVersion 18.6');
});

test('iOS 18 creates a missing iPhone 16', t => {
  const { run, writeTool } = fixture(t);
  writeTool('xcrun', `case "$*" in
    'simctl list --json') printf '%s\\n' '{"runtimes":[{"identifier":"fixture.iOS-18-6","name":"iOS 18.6","isAvailable":true}],"devices":{}}' ;;
    'simctl list devicetypes --json') printf '%s\\n' '{"devicetypes":[{"name":"iPhone 16","identifier":"fixture.iPhone-16"}]}' ;;
    'simctl create iPhone 16 fixture.iPhone-16 fixture.iOS-18-6') echo fixture-created-device ;;
    *) exit 2 ;;
esac\n`);
  const result = run(step(nightly.jobs['ios-18-weekly'], 'Select iOS 18 simulator').run);
  assert.equal(result.status, 0, result.log);
  assert.equal(result.env, 'CRYBOT_IOS18_SIMULATOR=fixture-created-device\n');
});
