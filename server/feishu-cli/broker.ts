import { readFile, mkdir, chmod, chown, lstat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, isAbsolute } from "node:path";
import { needsToken, validToken, type FeishuToken } from "./protocol.ts";

export interface BrokerConfig {
  tokenUrl: string;
  credentialFile: string;
  socketPath: string;
}

type Reply = { status: number; body: FeishuToken | { message: string; authorization_url?: string } };
const failure = (): Reply => ({ status: 502, body: { message: "飞书令牌代领失败，请联系管理员" } });

export function createTokenBroker(config: BrokerConfig, dependencies: { fetch?: typeof fetch; now?: () => number } = {}) {
  const fetcher = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? Date.now;
  let cached: FeishuToken | undefined;
  let retrievedAt = 0;
  let failed: { reply: Reply; until: number } | undefined;
  let pending: Promise<Reply> | undefined;
  async function retrieve(): Promise<Reply> {
    try {
      const credential = JSON.parse(await readFile(config.credentialFile, "utf8")).token;
      if (typeof credential !== "string" || !credential.trim()) return failure();
      const response = await fetcher(config.tokenUrl, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
        headers: { authorization: `Bearer ${credential}` },
      });
      const body: unknown = await response.json();
      const fields = body && typeof body === "object" ? body as Record<string, unknown> : {};
      // Even a misconfigured upstream must not echo the long-lived credential to callers.
      if (JSON.stringify(body).includes(credential) || Object.values(body ?? {}).some(value => typeof value === "string" && value.includes(credential))) return failure();
      if (!response.ok) return { status: response.status, body: {
        message: typeof fields.message === "string" ? fields.message : "需要授权飞书",
        ...(typeof fields.authorization_url === "string" ? { authorization_url: fields.authorization_url } : {}),
      } };
      if (!validToken(body, now())) return failure();
      retrievedAt = now();
      cached = { user_access_token: body.user_access_token, app_id: body.app_id, expires_at: body.expires_at };
      return { status: 200, body: cached };
    } catch { return failure(); }
  }
  return async (): Promise<Reply> => {
    if (failed && now() < failed.until) return failed.reply;
    if (cached && validToken(cached, now()) && (!needsToken(cached, now()) || now() - retrievedAt < 60_000)) return { status: 200, body: cached };
    pending ??= retrieve().then(reply => {
      if (reply.status !== 200) { cached = undefined; failed = { reply, until: now() + 30_000 }; }
      else failed = undefined;
      return reply;
    }).finally(() => { pending = undefined; });
    return pending;
  };
}

export class BrokerStartupError extends Error {
  constructor(message: "飞书代领服务配置无效" | "凭证文件必须仅 broker 用户可读" | "飞书套接字路径已存在或不可访问" | "飞书套接字目录必须归 broker 用户所有") {
    super(message);
  }
}

export async function startBroker(config: BrokerConfig) {
  const url = new URL(config.tokenUrl);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || !isAbsolute(config.socketPath) || !isAbsolute(config.credentialFile)) throw new BrokerStartupError("飞书代领服务配置无效");
  const credential = await lstat(config.credentialFile);
  if (!credential.isFile() || credential.uid !== process.getuid?.() || (credential.mode & 0o077) !== 0) throw new BrokerStartupError("凭证文件必须仅 broker 用户可读");
  try {
    await lstat(config.socketPath);
    throw new Error("飞书套接字路径已存在");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new BrokerStartupError("飞书套接字路径已存在或不可访问");
  }
  const directory = dirname(config.socketPath);
  await mkdir(directory, { recursive: true, mode: 0o750 });
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.uid !== process.getuid?.()) throw new BrokerStartupError("飞书套接字目录必须归 broker 用户所有");
  await chmod(directory, 0o700);
  await chown(directory, process.getuid!(), process.getgid!());
  const token = createTokenBroker(config);
  const server = createServer(async (req, res) => {
    const reply = req.method === "POST" && req.url === "/token" ? await token() : { status: 404, body: { message: "Not found" } };
    res.writeHead(reply.status, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(reply.body));
  });
  server.requestTimeout = 25_000;
  server.headersTimeout = 5_000;
  try {
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(config.socketPath, resolve); });
    await chmod(config.socketPath, 0o660);
    await chmod(directory, 0o750);
  } catch {
    server.close();
    throw new Error("飞书代领服务无法创建套接字");
  }
  return { close: () => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }), directory };
}
