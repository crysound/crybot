import { request } from "node:http";

export interface FeishuToken {
  user_access_token: string;
  app_id: string;
  expires_at: number;
}

export function validToken(value: unknown, now = Date.now()): value is FeishuToken {
  if (!value || typeof value !== "object") return false;
  const token = value as Partial<FeishuToken>;
  return typeof token.user_access_token === "string" && token.user_access_token.trim().length > 0 &&
    typeof token.app_id === "string" && token.app_id.trim().length > 0 &&
    typeof token.expires_at === "number" && Number.isSafeInteger(token.expires_at) && token.expires_at * 1000 > now;
}

export const needsToken = (token: FeishuToken, now = Date.now()): boolean => token.expires_at * 1000 - now <= 300_000;

export class BrokerAuthorizationError extends Error {
  readonly brokerMessage: string;
  readonly authorizationUrl: string | undefined;
  constructor(message: string, authorizationUrl?: string) {
    super([message, authorizationUrl].filter(Boolean).join("\n"));
    this.brokerMessage = message;
    this.authorizationUrl = authorizationUrl;
  }
}

export function brokerToken(socketPath: string): Promise<FeishuToken> {
  return new Promise((resolve, reject) => {
    const req = request({ socketPath, path: "/token", method: "POST" }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        body += chunk;
        if (body.length > 65_536) req.destroy(new Error("飞书代领服务响应过大"));
      });
      res.on("error", () => reject(new Error("飞书代领服务不可用")));
      res.on("end", () => {
        try {
          const value = JSON.parse(body);
          if (res.statusCode === 200 && validToken(value)) resolve(value);
          else if (res.statusCode !== 200) reject(new BrokerAuthorizationError(typeof value.message === "string" ? value.message : "飞书代领服务未返回有效令牌", typeof value.authorization_url === "string" ? value.authorization_url : undefined));
          else reject(new Error("飞书代领服务未返回有效令牌"));
        } catch { reject(new Error("飞书代领服务响应无效")); }
      });
    });
    const timeout = setTimeout(() => req.destroy(new Error("飞书代领服务超时")), 22_000);
    req.on("close", () => clearTimeout(timeout));
    req.on("error", () => reject(new Error("飞书代领服务不可用")));
    req.end();
  });
}
