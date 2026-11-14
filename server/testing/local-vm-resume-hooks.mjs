import './group-local-vm-hooks.mjs';
import { registerHooks } from 'node:module';

const state = process.env.CRYBOT_TEST_VM_STATE;
if (!state) throw new Error('An isolated VM state file is required');
const cache = new URL('../container-status-cache.ts', import.meta.url).href;
const record = `import { appendFileSync as recordResumeEvent } from 'node:fs';\n`;
registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    let source = String(result.source);
    if (url.endsWith('/group-local-vm-mock.mjs')) {
      source = `import { cachedContainerStatus, changingContainerStatus, invalidateContainerComputerStatus } from ${JSON.stringify(cache)};\n` + source;
      source = source.replace('export async function containerComputerStatus(_run, _platform, target = SHARED_LOCAL_VM_TARGET) {', `
        const runner = () => {};
        let scenario;
        export function containerComputerStatus(_run, _platform, target = SHARED_LOCAL_VM_TARGET, options = {}) {
          if (scenario !== read().scenario) { scenario = read().scenario; invalidateContainerComputerStatus(); }
          return cachedContainerStatus(runner, 'linux', target, options, () => probeResumeStatus(target));
        }
        async function probeResumeStatus(target) {
          const counted = read();
          counted.statusProbes = (counted.statusProbes ?? 0) + 1;
          writeFileAtomic(file, JSON.stringify(counted), { durable: false });`);
      source = source.replace('export async function containerComputerAction(action, _run, _platform, target = SHARED_LOCAL_VM_TARGET) {', `
        export async function containerComputerAction(action, _run, _platform, target = SHARED_LOCAL_VM_TARGET) {
          const finish = changingContainerStatus(target, action === 'pull');
          try { return await resumeAction(action, _run, _platform, target); }
          finally { finish(); }
        }
        async function resumeAction(action, _run, _platform, target) {
          if (action === 'start') {
            writeFileSync(file + '.starting', String(Date.now()));
            const counted = read(); counted.startAttempts = (counted.startAttempts ?? 0) + 1;
            writeFileAtomic(file, JSON.stringify(counted), { durable: false });
            await new Promise(resolve => setTimeout(resolve, read().startDelayMs ?? 5000));
            if (read().failStart) throw new Error('fixture wake failed: desktop could not start');
          }`);
      return { ...result, source };
    }
    if (url.endsWith('/local-vm-resume.ts')) {
      source = `import { readFileSync as readResumeState } from 'node:fs';\nlet resumeScenario;\n` + source.replace(
        'export function recentLocalVmWakeFailure(target: string): string | undefined {',
        `export function recentLocalVmWakeFailure(target: string): string | undefined {
          const scenario = JSON.parse(readResumeState(${JSON.stringify(state)}, 'utf8')).scenario;
          if (resumeScenario !== scenario) { resumeScenario = scenario; failures.clear(); }`);
      return { ...result, source };
    }
    if (url.endsWith('/index.ts')) {
      source = record + source.replace('function notify(notification: Notification | null, how?: { routine?: boolean; summary?: boolean }) {',
        `function notify(notification: Notification | null, how?: { routine?: boolean; summary?: boolean }) {
          recordResumeEvent(${JSON.stringify(state + '.notifications')}, JSON.stringify(notification) + '\\n');`);
      return { ...result, source };
    }
    if (url.endsWith('/host/chief-notices.ts')) {
      source = record + source.replace('function reportIncident(input: { kind: IncidentKind; bot: BotRecord; threadId: string; detail: string; facts?: RoutineFailureFacts; notified?: boolean }): void {',
        `function reportIncident(input: { kind: IncidentKind; bot: BotRecord; threadId: string; detail: string; facts?: RoutineFailureFacts; notified?: boolean }): void {
          recordResumeEvent(${JSON.stringify(state + '.incidents')}, JSON.stringify({ kind: input.kind, threadId: input.threadId }) + '\\n');`);
      return { ...result, source };
    }
    if (url.endsWith('/drivers/claude.ts')) {
      return { ...result, source: record + source.replaceAll(
        'for (const l of Array.from(listeners)) l(event);',
        `recordResumeEvent(${JSON.stringify(state + '.events')}, JSON.stringify({ type: event.type, threadId: event.threadId, at: Date.now() }) + '\\n');\nfor (const l of Array.from(listeners)) l(event);`,
      ) };
    }
    return result;
  },
});
