import { spawn } from "node:child_process";
import { dirname, isAbsolute, join } from "node:path";
import { BrokerAuthorizationError, brokerToken, needsToken, validToken } from "./protocol.ts";

function parseAuthorizationUrl(value: string | undefined): URL | undefined {
  if (!value || value.length > 2048 || /\s/u.test(value) || [...value].some(character => {
    const code = character.codePointAt(0)!;
    return code <= 0x1f || code === 0x7f;
  })) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : undefined;
  } catch { return undefined; }
}

export function feishuAuthorizationUrl(configured: string | undefined, broker?: string): string | undefined {
  const configuredUrl = parseAuthorizationUrl(configured);
  if (!configuredUrl) return undefined;
  const brokerUrl = parseAuthorizationUrl(broker);
  return (brokerUrl?.origin === configuredUrl.origin ? brokerUrl : configuredUrl).href;
}

export function cleanFeishuEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(source).filter(([key]) => !/^(LARKSUITE_CLI_|MEEGLE_|CRYBOT_FEISHU_)/i.test(key)));
}

export function cliInvocation(executable: string, args: string[], platform = process.platform): { command: string; args: string[] } {
  if (platform === "win32" && executable.toLowerCase().endsWith(".cmd")) {
    return { command: process.execPath, args: [join(dirname(executable), "node_modules", "@larksuite", "cli", "scripts", "run.js"), ...args] };
  }
  return { command: executable, args };
}

function cleanBrokerCharacter(character: string): string {
  const code = character.codePointAt(0)!;
  if (code === 0x061c || code === 0x180e || code === 0xfeff ||
    (code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2060 && code <= 0x2064) || (code >= 0x2066 && code <= 0x2069)) return "";
  if (/\s/u.test(character) || code === 0x85) return " ";
  if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return "";
  return character;
}

function brokerErrorMessage(error: unknown): string {
  const rawMessage = error instanceof BrokerAuthorizationError
    ? error.brokerMessage
    : error instanceof Error ? error.message : "";
  const message = [...rawMessage].map(cleanBrokerCharacter).join("")
    .replace(/ +/g, " ").trim().replace(/(?:https?:\/\/|www\.)\S+/gi, "[链接已移除]");
  const characters = [...message];
  return characters.length > 300 ? characters.slice(0, 299).join("") + "…" : message || "飞书代领服务不可用";
}

export async function runLarkCli(args: string[], source: NodeJS.ProcessEnv = process.env): Promise<number> {
  const command = args[0];
  if (command === "update") { console.error("请由管理员升级 lark-cli，不允许自行更新"); return 1; }
  if (command === "config") { console.error("飞书命令只使用本人身份，请在飞书授权页面管理连接"); return 1; }
  const help = args.includes("--help") || args.includes("-h") || command === "version" || command === "--version";
  if (command?.startsWith("-") && (!help || args.some(arg => !["--help", "-h", "--version"].includes(arg)))) { console.error("请先指定飞书子命令；使用 lark-cli --help 查看用法"); return 1; }
  const environment = cleanFeishuEnvironment(source);
  environment.LARKSUITE_CLI_STRICT_MODE = "user";
  environment.LARKSUITE_CLI_DEFAULT_AS = "user";
  environment.LARKSUITE_CLI_BRAND = "feishu";
  if (!help) {
    if (!source.CRYBOT_FEISHU_USER_TOKEN) { console.error("当前对话未开通飞书"); return 1; }
    let token = { user_access_token: source.CRYBOT_FEISHU_USER_TOKEN, app_id: source.CRYBOT_FEISHU_APP_ID ?? "", expires_at: Number(source.CRYBOT_FEISHU_EXPIRES_AT) };
    if (!validToken(token) || needsToken(token)) {
      if (!source.CRYBOT_FEISHU_BROKER_SOCKET) { console.error("飞书令牌已失效，请重新发起对话"); return 1; }
      try { token = await brokerToken(source.CRYBOT_FEISHU_BROKER_SOCKET); }
      catch (error) {
        const authorizationUrl = error instanceof BrokerAuthorizationError
          ? feishuAuthorizationUrl(source.CRYBOT_FEISHU_AUTHORIZATION_URL, error.authorizationUrl) : undefined;
        console.error([brokerErrorMessage(error), authorizationUrl].filter(Boolean).join(" "));
        return 1;
      }
    }
    if (command === "auth") {
      if (args[1] === "status") { console.log(JSON.stringify({ authorized: true, identity: "user" })); return 0; }
      console.error(`请在飞书授权页面连接或断开：${source.CRYBOT_FEISHU_AUTHORIZATION_URL || "请向管理员获取授权页地址"}`);
      return 1;
    }
    environment.LARKSUITE_CLI_APP_ID = token.app_id;
    environment.LARKSUITE_CLI_USER_ACCESS_TOKEN = token.user_access_token;
  }
  const executable = source.CRYBOT_LARK_CLI_EXECUTABLE;
  if (!executable || !isAbsolute(executable)) { console.error("请联系管理员配置真实飞书 CLI 的绝对路径"); return 1; }
  const invocation = cliInvocation(executable, args);
  if (process.versions.electron || (process.platform === "win32" && executable.toLowerCase().endsWith(".cmd"))) environment.ELECTRON_RUN_AS_NODE = "1";
  return new Promise(resolve => {
    const child = spawn(invocation.command, invocation.args, { env: environment, stdio: "inherit", windowsHide: true });
    child.on("error", () => { console.error("无法启动飞书 CLI，请联系管理员"); resolve(1); });
    child.on("exit", code => resolve(code ?? 1));
  });
}
