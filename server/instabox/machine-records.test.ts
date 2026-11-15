import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { createInstaboxMachineRecords } from "./machine-records.ts";
import { createInstaboxMachines } from "./machines.ts";
import { createInstaboxRequest, InstaboxError } from "./client.ts";
import { fakeInstaboxCore } from "../testing/fake-instabox-core.ts";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function directory() {
  const dir = mkdtempSync(join(tmpdir(), "cry-instabox-records-"));
  dirs.push(dir);
  return dir;
}

it("retains accepted creation and failed deletion across reloads, clearing only after successful deletion", async () => {
  const dir = directory();
  const fake = await fakeInstaboxCore();
  const records = createInstaboxMachineRecords(dir);
  const service = createInstaboxMachines(createInstaboxRequest("fixture-key", fake.url), records, "fixture-key");
  const hold = fake.holdNext("GET", "/v1/operations/op-1");
  const creation = service.ensureRunning("fixture-bot");
  try {
    await hold.reached;
    expect(createInstaboxMachineRecords(dir).has("fixture-bot")).toBe(true);
  } finally { hold.release(); }
  try {
    await creation;
    fake.failNext({ status: 503, code: "fixture_unavailable" });
    await expect(service.remove("fixture-bot")).rejects.toThrow("fixture_unavailable");
    expect(createInstaboxMachineRecords(dir).has("fixture-bot")).toBe(true);
    await service.remove("fixture-bot");
    expect(createInstaboxMachineRecords(dir).has("fixture-bot")).toBe(false);
  } finally { await fake.close(); }
});

it("remembers discovered machines without forgetting them on an empty inventory", async () => {
  const dir = directory();
  const fake = await fakeInstaboxCore();
  try {
    const request = createInstaboxRequest("fixture-key", fake.url);
    await createInstaboxMachines(request).ensureRunning("fixture-bot");
    const records = createInstaboxMachineRecords(dir);
    const service = createInstaboxMachines(request, records, "fixture-key");
    expect(records.has("fixture-bot")).toBe(false);
    await service.find("fixture-bot");
    expect(createInstaboxMachineRecords(dir).has("fixture-bot")).toBe(true);
    fake.machines.clear();
    expect(await service.find("fixture-bot")).toBeNull();
    expect(createInstaboxMachineRecords(dir).has("fixture-bot")).toBe(true);
  } finally { await fake.close(); }
});

it("does not treat unreadable records as an empty inventory", () => {
  const dir = directory();
  writeFileSync(join(dir, "instabox-machines.json"), "{}");
  expect(() => createInstaboxMachineRecords(dir).has("fixture-bot")).toThrow("Invalid InstaBox machine records");
});

it("persists only the truncated SHA-256 fingerprint and refreshes it when remembering", () => {
  const dir = directory();
  const records = createInstaboxMachineRecords(dir);
  const fingerprint = createHash("sha256").update("fixture-key").digest("hex").slice(0, 16);
  records.remember("fixture-bot", "fixture-machine", fingerprint);
  const raw = readFileSync(join(dir, "instabox-machines.json"), "utf8");
  expect(JSON.parse(raw)).toEqual([["fixture-bot", "fixture-machine", fingerprint]]);
  expect(raw).not.toContain("fixture-key");
  records.remember("fixture-bot", "fixture-machine", "0123456789abcdef");
  expect(createInstaboxMachineRecords(dir).get("fixture-bot")?.keyFingerprint).toBe("0123456789abcdef");
});

it.each([
  { credential: "same", result: "missing", succeeds: true },
  { credential: "same", result: "deleted", succeeds: true },
  { credential: "other", result: "missing", succeeds: false },
  { credential: "other", result: "deleted", succeeds: false },
  { credential: "unknown", result: "missing", succeeds: false },
  { credential: "unknown", result: "deleted", succeeds: false },
  { credential: "same", result: "running", succeeds: false },
  { credential: "same", result: "suspended", succeeds: false },
  { credential: "same", result: "deleting", succeeds: false },
  { credential: "same", result: "unavailable", succeeds: false },
  { credential: "same", result: "network", succeeds: false },
  { credential: "same", result: "invalid", succeeds: false },
])("checks the recorded machine with $credential credentials and a $result response", async ({ credential, result, succeeds }) => {
  const dir = directory();
  const fingerprint = createHash("sha256").update("fixture-key").digest("hex").slice(0, 16);
  const row = ["fixture-bot", "fixture-machine"];
  if (credential !== "unknown") row.push(fingerprint);
  writeFileSync(join(dir, "instabox-machines.json"), JSON.stringify([row]));
  const request = vi.fn(async (_method: string, path: string) => {
    if (path === "/v1/machines") return Response.json({ machines: [] });
    if (result === "missing") throw new InstaboxError(404, "not_found");
    if (result === "unavailable") throw new InstaboxError(503, "unavailable");
    if (result === "network") throw new InstaboxError(0, "network_error");
    if (result === "invalid") return new Response("invalid");
    return Response.json({ id: "fixture-machine", state: result });
  });
  const records = createInstaboxMachineRecords(dir);
  const service = createInstaboxMachines(request, records, credential === "other" ? "other-fixture-key" : "fixture-key");
  if (succeeds) await service.remove("fixture-bot");
  else await expect(service.remove("fixture-bot")).rejects.toThrow("Restore the original key before deleting");
  expect(createInstaboxMachineRecords(dir).has("fixture-bot")).toBe(!succeeds);
  if (!succeeds) expect(JSON.parse(readFileSync(join(dir, "instabox-machines.json"), "utf8"))).toEqual([row]);
  expect(request.mock.calls).toEqual([["GET", "/v1/machines", { query: { name: "crybot-fixture-bot" } }], ["GET", "/v1/machines/fixture-machine"]]);
});
