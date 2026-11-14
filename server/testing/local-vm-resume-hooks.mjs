import './group-local-vm-hooks.mjs';
import { registerHooks } from 'node:module';

const state = process.env.CRYBOT_TEST_VM_STATE;
if (!state) throw new Error('An isolated VM state file is required');
registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (url.endsWith('/group-local-vm-mock.mjs')) {
      return { ...result, source: String(result.source).replace(
        "export async function containerComputerAction(action, _run, _platform, target = SHARED_LOCAL_VM_TARGET) {",
        `export async function containerComputerAction(action, _run, _platform, target = SHARED_LOCAL_VM_TARGET) {
          if (action === 'start') {
            writeFileSync(file + '.starting', String(Date.now()));
            await new Promise(resolve => setTimeout(resolve, read().startDelayMs ?? 5000));
            if (read().failStart) throw new Error('fixture wake failed: desktop could not start');
          }`,
      ) };
    }
    if (url.endsWith('/drivers/claude.ts')) {
      return { ...result, source: `import { appendFileSync as recordResumeEvent } from 'node:fs';\n` + String(result.source).replaceAll(
        'for (const l of Array.from(listeners)) l(event);',
        `recordResumeEvent(${JSON.stringify(state + '.events')}, JSON.stringify({ type: event.type, threadId: event.threadId, at: Date.now() }) + '\\n');\nfor (const l of Array.from(listeners)) l(event);`,
      ) };
    }
    return result;
  },
});
