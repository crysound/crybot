import { createServer, type Server } from "node:http";

export interface FakeFeishuOptions {
  code?: string;
  codeVerifier?: string;
  user?: { union_id: string; tenant_key: string; name?: string; avatar_url?: string };
  tokenError?: boolean;
  userInfoError?: boolean;
  delayMs?: number;
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
  const server = createServer(async (req, res) => {
    if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    const url = new URL(req.url ?? "/", "http://fake.example.com");
    if (req.method === "GET" && url.pathname === "/open-apis/authen/v1/authorize") {
      const redirect = url.searchParams.get("redirect_uri");
      if (!redirect) { res.writeHead(400); res.end(); return; }
      const target = new URL(redirect);
      target.searchParams.set("code", options.code ?? "code_example");
      if (url.searchParams.has("state")) target.searchParams.set("state", url.searchParams.get("state")!);
      res.writeHead(302, { location: target.toString() }); res.end(); return;
    }
    if (req.method === "POST" && url.pathname === "/oauth/v3/token") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const form = new URLSearchParams(Buffer.concat(chunks).toString());
      if (options.tokenError || (options.code && form.get("code") !== options.code) || (options.codeVerifier && form.get("code_verifier") !== options.codeVerifier)) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ code: 20013 })); return; }
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ access_token: "user_access_token_example", token_type: "Bearer" })); return;
    }
    if (req.method === "GET" && url.pathname === "/open-apis/authen/v1/user_info") {
      if (options.userInfoError) { res.writeHead(500, { "content-type": "application/json" }); res.end(JSON.stringify({ code: 20014 })); return; }
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ code: 0, data: user })); return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fake Feishu did not bind");
  const origin = `http://127.0.0.1:${address.port}`;
  return { server, origin, authorizeEndpoint: `${origin}/open-apis/authen/v1/authorize`, tokenEndpoint: `${origin}/oauth/v3/token`, userInfoEndpoint: `${origin}/open-apis/authen/v1/user_info`, close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}

export const createFakeFeishu = startFakeFeishu;
