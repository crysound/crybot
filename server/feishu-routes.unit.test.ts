import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { feishuLoginConfig } from "./feishu-login.ts";
import { feishuExchangeRoute, type FeishuExchangeRouteOptions } from "./feishu-routes.ts";
import { SessionRegistry } from "./sessions.ts";

let directory: string;
let sessions: SessionRegistry;
let req: IncomingMessage;
let res: ServerResponse;
let options: FeishuExchangeRouteOptions;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "cry-feishu-response-"));
  sessions = new SessionRegistry({ file: join(directory, "sessions.json") });
  req = new IncomingMessage(new Socket());
  req.headers["content-type"] = "application/json";
  res = new ServerResponse(req);
  options = {
    config: feishuLoginConfig({ CRYBOT_FEISHU_APP_ID: "cli_example", CRYBOT_FEISHU_APP_SECRET: "secret_example", CRYBOT_FEISHU_TENANTS: "tenant_example", CRYBOT_FEISHU_ALLOW: "union_example" }),
    publicOrigin: "https://example.com",
    sessions,
    cookieName: "cry_session_test",
    readBody: async () => ({ code: "code_example", codeVerifier: "verifier_example", redirectUri: "https://example.com/auth/feishu/app-return", platform: "ios" }),
    fetch: vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ access_token: "user_access_token_example" }))
      .mockResolvedValueOnce(Response.json({ data: { union_id: "union_example", tenant_key: "tenant_example" } })),
    json: vi.fn(),
  };
});

afterEach(() => {
  res.destroy();
  req.destroy();
  sessions.close();
  vi.restoreAllMocks();
  rmSync(directory, { recursive: true, force: true });
});

const exchange = () => feishuExchangeRoute(options, req, res, "/api/auth/feishu/exchange", "POST");

it.each(["socket", "aborted", "destroyed", "ended"])("does not issue a session if %s closes while Feishu responds", async (state) => {
  const existing = Array.from({ length: 10 }, (_, index) => sessions.issueDevice("feishu:union_example", `Device ${index}`, { scopes: ["client"], maxAgeDays: 90 }));
  const before = sessions.list();
  options.fetch = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ access_token: "user_access_token_example" }))
    .mockImplementationOnce(async () => {
      if (state === "socket") req.socket.destroy();
      if (state === "aborted") req.aborted = true;
      if (state === "destroyed") res.destroy();
      if (state === "ended") res.end();
      return Response.json({ data: { union_id: "union_example", tenant_key: "tenant_example" } });
    });
  expect(await exchange()).toBe(true);
  expect(sessions.list()).toEqual(before);
  for (const device of existing) expect(sessions.authenticate(device.token)?.id).toBe(device.session.id);
  expect(options.json).not.toHaveBeenCalled();
});

it.each(["throw", "error", "close"])("revokes only the newly issued session on response %s", async (failure) => {
  const existing = sessions.issueDevice("feishu:union_example", "Other device", { scopes: ["client"], maxAgeDays: 90 });
  const access = sessions.issueAccess("feishu:union_example", "Browser");
  let token!: string;
  options.json = vi.fn((_res, status, body: any) => {
    expect(status).toBe(200);
    token = body.token;
    expect(sessions.authenticate(token)?.id).toBe(body.session.id);
    if (failure === "throw") throw new Error("write failed");
  });
  expect(await exchange()).toBe(true);
  if (failure === "error") res.emit("error", new Error("write failed"));
  if (failure === "close") res.emit("close");
  expect(options.json).toHaveBeenCalledTimes(1);
  expect(sessions.authenticate(token)).toBeNull();
  expect(sessions.authenticate(existing.token)?.id).toBe(existing.session.id);
  expect(sessions.authenticate(access.token)?.id).toBe(access.session.id);
  sessions.close();
  sessions = new SessionRegistry({ file: join(directory, "sessions.json") });
  expect(sessions.authenticate(token)).toBeNull();
  expect(sessions.authenticate(existing.token)?.id).toBe(existing.session.id);
  expect(sessions.authenticate(access.token)?.id).toBe(access.session.id);
});

it("keeps a delivered session when the response closes after finish", async () => {
  let token!: string;
  options.json = vi.fn((_res, status, body: any) => {
    expect(status).toBe(200);
    token = body.token;
    expect(body.cookieName).toBe("cry_session_test");
    res.emit("finish");
  });
  expect(await exchange()).toBe(true);
  res.emit("close");
  expect(sessions.authenticate(token)?.source).toBe("device");
});
