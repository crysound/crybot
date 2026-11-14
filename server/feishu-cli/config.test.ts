import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { botBox } from "../bot-box/box.ts";
import { PATH_ENV_NAMES } from "../bot-box/plan.ts";
import { feishuCliUser } from "./config.ts";

let directory: string;
let env: NodeJS.ProcessEnv;
beforeEach(async () => {
  directory = await mkdtemp("/tmp/feishu-config-");
  await mkdir(join(directory, "home"));
  await mkdir(join(directory, "data", "workspaces", "fixture"), { recursive: true });
  vi.spyOn(botBox, "enabled").mockReturnValue(true);
  vi.spyOn(botBox, "startOptions").mockReturnValue({
    dataDir: join(directory, "data"), home: join(directory, "home"),
    port: 0, denyEnv: new Set(), codeRoots: [], engineRoots: [],
  });
  for (const name of PATH_ENV_NAMES) vi.stubEnv(name, undefined);
  env = { CRYBOT_FEISHU_CLI_USERS: "test_union" };
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

function expectDenied(socket: string): void {
  const warn = vi.fn();
  expect(feishuCliUser({ ...env, CRYBOT_FEISHU_BROKER_SOCKET: socket }, warn)).toBeUndefined();
  expect(warn.mock.calls).toEqual([["飞书代领套接字路径对非授权盒子可见，已停用"]]);
}

it("rejects a socket whose parent symlink resolves into /opt", async () => {
  const alias = join(directory, "alias");
  await symlink("/opt", alias);
  expectDenied(join(alias, "token.sock"));
});

it.each(["data/workspaces/fixture", "home"])("rejects a socket under %s", folder => {
  expectDenied(join(directory, folder, "token.sock"));
});

it.each(["data/workspaces/fixture", "home"])("rejects a socket reached through a symlink into %s", async folder => {
  const alias = join(directory, "alias");
  await symlink(join(directory, folder), alias);
  expectDenied(join(alias, "token.sock"));
});

it("rejects a missing parent in a shared read-only mount", () => {
  expectDenied("/opt/feishu-config-missing/token.sock");
});

it("allows a socket in /run with a missing parent", () => {
  expect(feishuCliUser({ ...env, CRYBOT_FEISHU_BROKER_SOCKET: "/run/feishu-config-missing/token.sock" })).toBe("test_union");
});

it("allows a socket in an independent /tmp directory", () => {
  expect(feishuCliUser({ ...env, CRYBOT_FEISHU_BROKER_SOCKET: join(directory, "token.sock") })).toBe("test_union");
});

it.each(PATH_ENV_NAMES)("uses the service process %s when checking mount visibility", name => {
  vi.stubEnv(name, "/fixture/feishu-shared");
  expectDenied("/fixture/feishu-shared/token.sock");
});
