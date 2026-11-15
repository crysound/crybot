import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sharedScreenTarget } from "../container-targets.ts";
import { screenFileAccess } from "../screen-files.ts";

export async function screenFilesFixture(screen = 2) {
  const root = await mkdtemp(join(tmpdir(), "crybot-screen-files-"));
  const workspace = join(root, "container", "home", "cua", "workspace");
  const screenDir = join(workspace, "screens", `s${screen}`);
  await mkdir(screenDir, { recursive: true });
  const runtime = join(root, "runtime");
  await writeFile(runtime, `#!/usr/bin/env python3
import json, os, sys
base = os.path.dirname(__file__)
a = sys.argv[1:]
with open(os.path.join(base, 'calls.jsonl'), 'a') as log:
    log.write(json.dumps(a) + '\\n')
if 'sh' in a and 'tar -C' in ' '.join(a):
    if a[a.index('-u') + 1] != 'crybot-s${screen}':
        sys.stderr.write('wrong screen user')
        sys.exit(43)
    sh = max(i for i, value in enumerate(a) if value == 'sh')
    home = a[sh + 4]
    relative = a[sh + 5]
    container_home = os.path.join(base, 'container', home.lstrip('/'))
    source = os.path.join(container_home, relative)
    current = container_home
    for part in relative.split('/'):
        current = os.path.join(current, part)
        if os.path.islink(current):
            sys.exit(42)
    if not os.path.lexists(source):
        sys.exit(44)
    resolved = os.path.realpath(source)
    real_home = os.path.realpath(container_home)
    if real_home != container_home or not resolved.startswith(real_home + os.sep) or not os.path.isdir(resolved):
        sys.exit(42)
    import tarfile
    with tarfile.open(fileobj=sys.stdout.buffer, mode='w|') as archive:
        archive.add(resolved, arcname='.', recursive=True)
else:
    command = a[a.index('python3'):]
    command[4] = os.path.join(base, 'container', command[4].lstrip('/'))
    os.execvp('python3', command)
`);
  await chmod(runtime, 0o755);
  const target = { ...sharedScreenTarget(screen), workspaceDir: workspace };
  return {
    root, workspace, screenDir, runtime, target, access: screenFileAccess(runtime, target),
    async calls(): Promise<string[][]> { return (await readFile(join(root, "calls.jsonl"), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)); },
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}
