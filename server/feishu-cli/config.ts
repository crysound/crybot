import { realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { botBox, defaultCodeRoots } from "../bot-box/box.ts";
import { PATH_ENV_NAMES, planBox, under, visibleInBox } from "../bot-box/plan.ts";
import { engineInstallRoots } from "../engine-roots.ts";
import { identityList } from "../feishu-login.ts";

const SOCKET_PATH_WARNING = "飞书代领套接字路径对非授权盒子可见，已停用";

function realDirectory(path: string): string | undefined {
  try { return realpathSync(path); }
  catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? resolve(path) : undefined;
  }
}

function hiddenFromUnprivilegedBox(socketPath: string): boolean {
  const started = botBox.startOptions();
  if (!started) return false;
  const parent = realDirectory(dirname(socketPath));
  const dataDir = realDirectory(started.dataDir);
  const home = realDirectory(started.home ?? process.env.HOME ?? "/");
  if (!parent || !dataDir || !home) return false;
  const realSocketPath = join(parent, basename(socketPath));
  if (under(realSocketPath, dataDir) || under(realSocketPath, home)) return false;
  const plan = planBox({
    dataDir: started.dataDir,
    home: started.home ?? process.env.HOME ?? "/",
    codeRoots: started.codeRoots ?? defaultCodeRoots(),
    engineRoots: started.engineRoots ?? engineInstallRoots(started.dataDir),
    bridges: [],
  }, { command: "", args: [], env: Object.fromEntries(PATH_ENV_NAMES.map(name => [name, process.env[name]])) });
  return visibleInBox(plan, realSocketPath) === "none";
}

export function feishuCliUser(env: NodeJS.ProcessEnv = process.env, warn?: (message: string) => void): string | undefined {
  const users = identityList(env.CRYBOT_FEISHU_CLI_USERS, "CRYBOT_FEISHU_CLI_USERS", false);
  if (users.length > 1) {
    warn?.("飞书代领只支持一位用户，当前名单超过一人，已停用");
    return undefined;
  }
  if (!users.length || !env.CRYBOT_FEISHU_BROKER_SOCKET) return undefined;
  if (!botBox.enabled()) {
    warn?.("飞书代领需要开启智能体沙箱，当前未开启，已停用");
    return undefined;
  }
  if (!hiddenFromUnprivilegedBox(env.CRYBOT_FEISHU_BROKER_SOCKET)) {
    warn?.(SOCKET_PATH_WARNING);
    return undefined;
  }
  return users[0];
}
