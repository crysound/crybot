import { registerHooks } from 'node:module';
import { replaceFixtureSource } from './fixture-source.ts';
import { createInterface } from 'node:readline';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const file = process.env.CRYBOT_TEST_VM_STATE;
if (!file) throw new Error('An isolated screen fixture state file is required');

if (process.argv[2] === '--fake-docker') {
  const args = process.argv.slice(3);
  const row = { args, at: Date.now() };
  appendFileSync(file + '.execs', JSON.stringify(row) + '\n');
  const command = args.join(' ');
  const screen = Number(command.match(/screen-s([1-4]):\*/)?.[1]);
  if (command.includes('supervisorctl') && command.includes(' start ')) {
    for await (const _chunk of process.stdin) {}
    writeFileSync(file + '.screen-' + screen, 'running');
    const delayMs = JSON.parse(readFileSync(file, 'utf8')).screenReadyDelayMs?.[screen] ?? 0;
    writeFileSync(file + '.ready-at-' + screen, String(Date.now() + delayMs));
  } else if (command.includes('supervisorctl') && command.includes(' stop ')) {
    writeFileSync(file + '.screen-' + screen, 'off');
  } else if (command.includes('supervisorctl') && command.endsWith(' status')) {
    for (let n = 1; n <= 4; n++) {
      const running = existsSync(file + '.screen-' + n) && readFileSync(file + '.screen-' + n, 'utf8') === 'running';
      for (const name of ['x', 'dbus', 'session', 'cua']) process.stdout.write(`screen-s${n}:screen-s${n}-${name} ${running ? 'RUNNING' : 'STOPPED'}\n`);
    }
  } else if (args.includes('mcp') && args.includes('--socket')) {
    for await (const line of createInterface({ input: process.stdin })) {
      const frame = JSON.parse(line);
      if (frame.id === undefined) continue;
      const result = frame.method === 'initialize'
        ? { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'screen-fixture', version: '1' } }
        : frame.method === 'tools/list' ? { tools: [{ name: 'get_desktop_state', description: 'Read the desktop', inputSchema: { type: 'object', properties: {} } }] }
          : { content: [{ type: 'text', text: 'fixture desktop' }] };
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: frame.id, result }) + '\n');
    }
  } else if (command.includes('--socket')) {
    const socketScreen = Number(command.match(/\/run\/user\/6100([1-4])\//)?.[1]);
    const readyAtFile = file + '.ready-at-' + socketScreen;
    if (socketScreen && existsSync(readyAtFile) && Date.now() < Number(readFileSync(readyAtFile, 'utf8'))) {
      process.stderr.write('screen socket is still starting\n');
      process.exit(1);
    }
    process.stdout.write('{}');
  }
} else {
  const actual = new URL('../container-computer.ts?screen-actual', import.meta.url).href;
  const mock = new URL('./local-vm-screens-mock.mjs', import.meta.url).href;
  registerHooks({
    resolve(specifier, context, next) {
      if (specifier.endsWith('/container-computer.ts')) return { url: mock, shortCircuit: true };
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url === mock) return { format: 'module', shortCircuit: true, source: `
        export * from ${JSON.stringify(actual)};
        import { SHARED_LOCAL_VM_TARGET, containerTargetOf, containerRunArgs } from ${JSON.stringify(actual)};
        import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
        const file = ${JSON.stringify(file)};
        export async function containerRuntimeStatus() { return { runtime: 'docker', daemonUp: true }; }
        export async function containerComputerExists() { return JSON.parse(readFileSync(file, 'utf8')).container !== 'missing'; }
        export async function containerComputerStatus(_runner, _platform, target = SHARED_LOCAL_VM_TARGET) {
          const state = JSON.parse(readFileSync(file, 'utf8'));
          return { runtime: 'docker', daemonUp: true, image: !state.imageMissing, imageMatches: state.imageMatches !== false, managed: state.container !== 'missing',
            network: 'loopback', security: 'hardened', persistence: 'durable', create_supported: true,
            container_name: target.containerName, workspace_path: target.workspaceDir, resumable: state.container === 'stopped',
            container: state.container, ready: state.container === 'running' && !state.imageMissing && state.imageMatches !== false, desktopReady: true,
            screens_layout: state.layout, target_key: target.key, viewer_port: 6080,
            viewer_url: 'http://127.0.0.1:6080/vnc.html#password=single-fixture', problem: null };
        }
        export async function containerComputerAction(action, _runner, _platform, target = SHARED_LOCAL_VM_TARGET, resources, layout = 'single') {
          if (action === 'pull') while (JSON.parse(readFileSync(file, 'utf8')).holdPull) await new Promise(resolve => setTimeout(resolve, 30));
          const state = JSON.parse(readFileSync(file, 'utf8'));
          appendFileSync(file + '.actions', JSON.stringify({ action, target: containerTargetOf(target).key, at: Date.now(),
            ...(action === 'run' ? { args: containerRunArgs('docker', 'single-fixture', target, { platform: 'linux', hostUser: null, resources, screensLayout: layout }) } : {}) }) + '\\n');
          if (action === 'stop') state.container = 'stopped';
          if (action === 'remove') state.container = 'missing';
          if (action === 'pull') state.imageMissing = false;
          if (action === 'run') { state.container = 'running'; state.layout = layout; state.imageMatches = true; }
          if (action === 'start') state.container = 'running';
          writeFileSync(file, JSON.stringify(state));
          return containerComputerStatus(undefined, undefined, target);
        }
        export async function containerComputerFrame() { return { png: '', format: 'png' }; }
      ` };
      const result = next(url, context);
      if (url.endsWith('/computer-idle.ts')) return { ...result, source: replaceFixtureSource(String(result.source), 'this.idleMs = checkedIdleMs(idleMs);', 'this.idleMs = checkedIdleMs(idleMs >= 300000 ? 1200 : idleMs);') };
      if (url.endsWith('/harness/bus.ts')) return { ...result, source: `import { appendFileSync as recordScreenEvent } from 'node:fs';\n` + replaceFixtureSource(String(result.source), 'publish(unstamped: RuntimeEvent) {', `publish(unstamped: RuntimeEvent) { if (unstamped.type.startsWith('turn.wait_')) recordScreenEvent(${JSON.stringify(file + '.events')}, JSON.stringify(unstamped) + '\\n');`) };
      if (url.endsWith('/turn-resources.ts')) return { ...result, source: `import { appendFileSync as recordScreenResource } from 'node:fs';\n` + replaceFixtureSource(String(result.source), 'this.owners.set(resource, owner);', `this.owners.set(resource, owner); recordScreenResource(${JSON.stringify(file + '.resources')}, JSON.stringify({ resource, owner }) + '\\n');`) };
      return result;
    },
  });
}
