import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runLarkCli, cliInvocation } from "./wrapper.ts";
import { brokerToken, BrokerAuthorizationError } from "./protocol.ts";

vi.mock("./protocol.ts", async original => ({ ...await original<typeof import("./protocol.ts")>(), brokerToken: vi.fn() }));
let directory: string;
let environment: NodeJS.ProcessEnv;
let error: ReturnType<typeof vi.spyOn>;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "feishu-wrapper-"));
  const executable = join(directory, "cli.mjs");
  await writeFile(executable, `#!${process.execPath}\nimport {writeFileSync} from 'node:fs'; writeFileSync(process.env.FIXTURE_DUMP, JSON.stringify(process.env)); process.exit(Number(process.env.FIXTURE_EXIT || 0));`, { mode: 0o700 });
  environment = { PATH: process.env.PATH, CRYBOT_LARK_CLI_EXECUTABLE: executable, FIXTURE_DUMP: join(directory, "env.json"), CRYBOT_FEISHU_USER_TOKEN: "fixture-short", CRYBOT_FEISHU_APP_ID: "fixture-app", CRYBOT_FEISHU_EXPIRES_AT: String(Math.floor(Date.now() / 1000) + 3600) };
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(async () => { vi.restoreAllMocks(); vi.mocked(brokerToken).mockReset(); await rm(directory, { recursive: true, force: true }); });

it("denies an unenabled conversation even when a broker socket was inherited", async () => {
  delete environment.CRYBOT_FEISHU_USER_TOKEN;
  environment.CRYBOT_FEISHU_BROKER_SOCKET = "/unused.sock";
  expect(await runLarkCli(["calendar", "list"], environment)).toBe(1);
  expect(error).toHaveBeenCalledWith("当前对话未开通飞书");
  expect(brokerToken).not.toHaveBeenCalled();
});

it.each(["update", "config"])("blocks %s even with --help", async command => {
  expect(await runLarkCli([command, "--help"], environment)).toBe(1);
  expect(brokerToken).not.toHaveBeenCalled();
});

it("reports only authorized user status", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  expect(await runLarkCli(["auth", "status"], environment)).toBe(0);
  expect(log.mock.calls).toEqual([['{"authorized":true,"identity":"user"}']]);
  environment.CRYBOT_FEISHU_AUTHORIZATION_URL = "https://example.invalid/authorize";
  expect(await runLarkCli(["auth", "login"], environment)).toBe(1);
  expect(error).toHaveBeenCalledWith("请在飞书授权页面连接或断开：https://example.invalid/authorize");
});

it.skipIf(process.platform === "win32").each([["--help"], ["calendar", "--help"], ["version"]])("runs help/version without credentials: %j", async (...args) => {
  delete environment.CRYBOT_FEISHU_USER_TOKEN;
  expect(await runLarkCli(args, environment)).toBe(0);
  expect(brokerToken).not.toHaveBeenCalled();
  const received = JSON.parse(await readFile(environment.FIXTURE_DUMP!, "utf8"));
  expect(received.LARKSUITE_CLI_USER_ACCESS_TOKEN).toBeUndefined();
});

it.skipIf(process.platform === "win32")("sanitizes inherited identities and preserves high-risk exit code 10", async () => {
  Object.assign(environment, { LARKSUITE_CLI_APP_SECRET: "fixture-secret", LARKSUITE_CLI_USER_ACCESS_TOKEN: "wrong", LARKSUITE_CLI_STRICT_MODE: "tenant", MEEGLE_TOKEN: "wrong", meeglE_config: "wrong", FIXTURE_EXIT: "10" });
  expect(await runLarkCli(["calendar", "list"], environment)).toBe(10);
  const received = JSON.parse(await readFile(environment.FIXTURE_DUMP!, "utf8"));
  expect(received).toMatchObject({ LARKSUITE_CLI_USER_ACCESS_TOKEN: "fixture-short", LARKSUITE_CLI_APP_ID: "fixture-app", LARKSUITE_CLI_STRICT_MODE: "user", LARKSUITE_CLI_DEFAULT_AS: "user", LARKSUITE_CLI_BRAND: "feishu" });
  expect(received.LARKSUITE_CLI_APP_SECRET).toBeUndefined();
  expect(Object.keys(received).filter(key => /^(MEEGLE_|CRYBOT_FEISHU_)/i.test(key))).toEqual([]);
});

it.skipIf(process.platform === "win32")("passes the refreshed token to an ordinary CLI command", async () => {
  environment.CRYBOT_FEISHU_EXPIRES_AT = String(Math.floor(Date.now() / 1000) + 299);
  environment.CRYBOT_FEISHU_BROKER_SOCKET = "/fixture/token.sock";
  vi.mocked(brokerToken).mockResolvedValue({ user_access_token: "fixture-new", app_id: "app", expires_at: Math.floor(Date.now() / 1000) + 600 });
  expect(await runLarkCli(["calendar", "list"], environment)).toBe(0);
  const received = JSON.parse(await readFile(environment.FIXTURE_DUMP!, "utf8"));
  expect(received.LARKSUITE_CLI_USER_ACCESS_TOKEN).toBe("fixture-new");
  expect(brokerToken).toHaveBeenCalledWith("/fixture/token.sock");
  expect(environment.CRYBOT_FEISHU_USER_TOKEN).toBe("fixture-short");
});

it("uses the fixed JS entry for Windows cmd shims, never a shell", () => {
  expect(cliInvocation("/cli/lark-cli.cmd", ["calendar", "&"], "win32")).toEqual({ command: process.execPath, args: [join("/cli", "node_modules", "@larksuite", "cli", "scripts", "run.js"), "calendar", "&"] });
});


it("does not let leading global options bypass the update refusal", async () => {
  expect(await runLarkCli(["--help", "update"], environment)).toBe(1);
  expect(await runLarkCli(["--verbose", "update"], environment)).toBe(1);
  expect(brokerToken).not.toHaveBeenCalled();
});

it("reports authorization details and fails without running the CLI when refresh is denied", async () => {
  environment.CRYBOT_FEISHU_EXPIRES_AT = "1";
  environment.CRYBOT_FEISHU_BROKER_SOCKET = "/fixture/token.sock";
  vi.mocked(brokerToken).mockRejectedValue(new BrokerAuthorizationError("请重新授权", "https://example.invalid/authorize"));
  expect(await runLarkCli(["calendar", "list"], environment)).toBe(1);
  expect(error).toHaveBeenCalledWith("请重新授权 https://example.invalid/authorize");
  expect(JSON.stringify(error.mock.calls)).not.toContain(environment.CRYBOT_FEISHU_USER_TOKEN);
  await expect(readFile(environment.FIXTURE_DUMP!)).rejects.toMatchObject({ code: "ENOENT" });
});

it.each([
  ["\u001b[31m失败\r\n\t 请重试\u0000\u007f\u0080\u0085\u009f", "[31m失败 请重试"],
  ["\u001b[31m失败\n" + "文".repeat(400), "[31m失败 " + "文".repeat(292) + "…"],
  ["文".repeat(300), "文".repeat(300)],
  ["文".repeat(301), "文".repeat(299) + "…"],
  ["😀".repeat(301), "😀".repeat(299) + "…"],
  ["\u001b\u0000\u007f\u0080\u009f\n\t ", "飞书代领服务不可用"],
  ["", "飞书代领服务不可用"],
])("sanitizes broker failure text before writing stderr (%#)", async (message, expected) => {
  environment.CRYBOT_FEISHU_EXPIRES_AT = "1";
  environment.CRYBOT_FEISHU_BROKER_SOCKET = "/fixture/token.sock";
  vi.mocked(brokerToken).mockRejectedValue(new BrokerAuthorizationError(message));
  expect(await runLarkCli(["calendar", "list"], environment)).toBe(1);
  expect(error.mock.calls).toEqual([[expected]]);
  const output = error.mock.calls[0][0] as string;
  expect([...output].length).toBeLessThanOrEqual(300);
  expect([...output].some(character => {
    const code = character.codePointAt(0)!;
    return code <= 0x1f || (code >= 0x7f && code <= 0x9f);
  })).toBe(false);
  await expect(readFile(environment.FIXTURE_DUMP!)).rejects.toMatchObject({ code: "ENOENT" });
});
