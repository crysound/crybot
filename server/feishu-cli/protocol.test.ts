import { EventEmitter } from "node:events";
import { request } from "node:http";
import { afterEach, expect, it, vi } from "vitest";
import { brokerToken, BrokerAuthorizationError } from "./protocol.ts";

vi.mock("node:http", () => ({ request: vi.fn() }));
afterEach(() => vi.resetAllMocks());

it.each([401, 403])("decodes a %i response into structured authorization details without copying token fields", async statusCode => {
  const body = { message: "请访问 https://evil.example/x 重新授权", authorization_url: "https://example.invalid/authorize", user_access_token: "fixture-private-token" };
  vi.mocked(request).mockImplementation((_options: any, receive: any): any => {
    const req = Object.assign(new EventEmitter(), {
      end() {
        const res = Object.assign(new EventEmitter(), { statusCode, setEncoding: vi.fn() });
        receive(res);
        res.emit("data", JSON.stringify(body));
        res.emit("end");
        req.emit("close");
      },
    });
    return req;
  });
  const error = await brokerToken("/fixture/token.sock").catch(error => error);
  expect(error).toBeInstanceOf(BrokerAuthorizationError);
  expect(error.message).toBe(`${body.message}\n${body.authorization_url}`);
  expect(error.brokerMessage).toBe(body.message);
  expect(error.authorizationUrl).toBe(body.authorization_url);
  expect(JSON.stringify(error)).not.toContain(body.user_access_token);
});
