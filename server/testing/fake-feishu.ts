import { createServer, type Server } from "node:http";
import { createHash } from "node:crypto";

export interface FakeFeishuOptions {
  code?: string;
  codeVerifier?: string;
  user?: { union_id: string; tenant_key: string; name?: string; avatar_url?: string };
  tokenError?: boolean;
  userInfoError?: boolean;
  delayMs?: number;
  tokenDelayMs?: number;
  userInfoDelayMs?: number;
  authorizeDelayMs?: number;
  tokenStatus?: number;
  userInfoStatus?: number;
  clientSecret?: string;
  onTokenRequest?: () => void | Promise<void>;
}

export interface FakeFeishu {
  server: Server;
  origin: string;
  authorizeEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  close(): Promise<void>;
}

export async function startFakeFeishu(options: FakeFeishuOptions = {}): Promise<FakeFeishu> {
  const user = options.user ?? { union_id: "union_example", tenant_key: "tenant_example", name: "Example User" };
  const challenges = new Map<string, string>();
  const redirects = new Map<string, string>();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://fake.example.com");
      const delay = options.delayMs ?? (url.pathname === "/oauth/v3/token" ? options.tokenDelayMs : url.pathname === "/open-apis/authen/v1/user_info" ? options.userInfoDelayMs : options.authorizeDelayMs);
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      if (req.method === "GET" && url.pathname === "/open-apis/authen/v1/authorize") {
        const redirect = url.searchParams.get("redirect_uri");
        const code = options.code ?? "code_example";
        if (!redirect) { res.writeHead(400); res.end(); return; }
        let target: URL;
        try { target = new URL(redirect); } catch { res.writeHead(400); res.end(); return; }
        const challenge = url.searchParams.get("code_challenge");
        if (challenge) challenges.set(code, challenge);
        redirects.set(code, redirect);
        target.searchParams.set("code", code);
        if (url.searchParams.has("state")) target.searchParams.set("state", url.searchParams.get("state")!);
        res.writeHead(302, { location: target.toString() }); res.end(); return;
      }
      if (req.method === "POST" && url.pathname === "/oauth/v3/token") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const form = new URLSearchParams(Buffer.concat(chunks).toString());
        await options.onTokenRequest?.();
        const verifier = form.get("code_verifier") ?? "";
        const expectedChallenge = challenges.get(form.get("code") ?? "");
        const pkceInvalid = expectedChallenge !== undefined && createHash("sha256").update(verifier).digest("base64url") !== expectedChallenge;
        const expectedRedirect = redirects.get(form.get("code") ?? "");
        const contentType = String(req.headers["content-type"] ?? "").toLowerCase();
        if (!contentType.startsWith("application/x-www-form-urlencoded")) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ code: 20010 })); return; }
        if (expectedRedirect !== undefined && form.get("redirect_uri") !== expectedRedirect) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ code: 20071 })); return; }
        const invalid = options.tokenError || form.get("grant_type") !== "authorization_code" || !form.get("client_secret") || (options.clientSecret !== undefined && form.get("client_secret") !== options.clientSecret) || (options.code && form.get("code") !== options.code) || (options.codeVerifier && verifier !== options.codeVerifier) || pkceInvalid;
        if (invalid) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ code: 20013 })); return; }
        const status = options.tokenStatus ?? 200;
        res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(status >= 400 ? { code: 20013 } : { access_token: "user_access_token_example", token_type: "Bearer" })); return;
      }
      if (req.method === "GET" && url.pathname === "/open-apis/authen/v1/user_info") {
        if (req.headers.authorization !== "Bearer user_access_token_example") { res.writeHead(401, { "content-type": "application/json" }); res.end(JSON.stringify({ code: 20015 })); return; }
        if (options.userInfoError) { res.writeHead(500, { "content-type": "application/json" }); res.end(JSON.stringify({ code: 20014 })); return; }
        const status = options.userInfoStatus ?? 200;
        res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(status >= 400 ? { code: 20014 } : { code: 0, data: user })); return;
      }
      res.writeHead(404); res.end();
    } catch {
      if (!res.destroyed && !res.headersSent) res.writeHead(500).end();
      else if (!res.destroyed) res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fake Feishu did not bind");
  const origin = `http://127.0.0.1:${address.port}`;
  return { server, origin, authorizeEndpoint: `${origin}/open-apis/authen/v1/authorize`, tokenEndpoint: `${origin}/oauth/v3/token`, userInfoEndpoint: `${origin}/open-apis/authen/v1/user_info`, close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}

export const createFakeFeishu = startFakeFeishu;
