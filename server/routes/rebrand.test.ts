import type { IncomingMessage, ServerResponse } from "node:http";
import { expect, it } from "vitest";
import { createStatusRoutes, type StatusRouteDeps } from "./status.ts";
import type { RouteContext } from "./table.ts";

it("serves the fixed identity and OSS edition for owner and member scopes", async () => {
  const route = createStatusRoutes({ staticDir: null, sharedWorkspaceFullAccessEnabled: () => false } as StatusRouteDeps);
  for (const scopes of [["admin", "client"], ["client"]] as const) {
    for (const [path, expected] of [
      ["/api/health", { app: "crybot" }],
      ["/api/edition", { edition: "oss", features: [] }],
      ["/api/brand", { brand: { name: "Cry Bot" }, source: "default" }],
    ] as const) {
      let body: unknown;
      let code: number | undefined;
      await route({
        req: {} as IncomingMessage, res: {} as ServerResponse,
        path, method: "GET", url: new URL(path, "http://localhost"),
        auth: { kind: "loopback", scopes: [...scopes] },
        json: (_res, status, value) => { code = status; body = value; },
        readBody: async () => ({}),
      } satisfies RouteContext);
      expect(code).toBe(200);
      if (path === "/api/health") expect(body).toMatchObject(expected);
      else expect(body).toEqual(expected);
    }
  }
});
