import { expect, it } from "vitest";
import { launchAndCapture } from "./testing/ios-contract/live.ts";

it.skipIf(process.env.CRYBOT_RUN_IOS_CONTRACT_E2E !== "1")("captures authenticated responses and a complete SSE exchange", async () => {
  const { samples, statuses, frames } = await launchAndCapture();
  for (const [path, status] of Object.entries(statuses)) expect(status, path).toBe(path === "/api/auth/pair" ? 401 : /^\/api\/bots\/[^/]+\/messages$/.test(path) ? 202 : 200);
  expect(samples.find(s => s.swiftType === "AuthSession")?.value).toMatchObject({ kind: "session", via: "bearer" });
  expect(samples.find(s => s.swiftType === "SendResponse")?.value).toMatchObject({ ok: true, threadId: expect.any(String) });
  expect(samples.find(s => s.swiftType === "APIError")?.value).toMatchObject({ error: expect.any(String), errorKey: "serverError.pair.codeWrong" });
  for (const kind of ["hello", "message", "runtime", "ping"]) expect(frames.some(f => f.kind === kind), kind).toBe(true);
  expect(samples.filter(s => s.swiftType === "ThreadPage")).toHaveLength(2);
}, 120_000);
