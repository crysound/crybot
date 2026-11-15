import { afterEach, expect, it, vi } from "vitest";
import { createInstaboxMachineCache, instaboxComputerAction, instaboxFailureResponse, instaboxStatus, requireInstabox, withInstaboxBackendPower } from "./power.ts";
import { createInstaboxRequest } from "./client.ts";
import type { InstaboxMachines } from "./machine.ts";
import type { RouteContext } from "../routes/table.ts";
import type { BotRecord } from "../store.ts";

afterEach(() => vi.unstubAllEnvs());

it("reuses machines for the same key and replaces the instance after key rotation or clearing", () => {
  vi.stubEnv("INSTABOX_API_KEY", "");
  const factory = vi.fn(createInstaboxRequest);
  const machinesFor = createInstaboxMachineCache(factory);
  expect(machinesFor({})).toBeNull();
  const first = machinesFor({ instabox: { apiKey: "fixture-one" } });
  expect(machinesFor({ instabox: { apiKey: "fixture-one" } })).toBe(first);
  expect(machinesFor({ instabox: { apiKey: "fixture-two" } })).not.toBe(first);
  expect(factory).toHaveBeenCalledTimes(2);
  expect(machinesFor({})).toBeNull();
  expect(machinesFor({ instabox: { apiKey: "fixture-one" } })).not.toBe(first);
});

it("makes missing credentials explicit in status and lifecycle actions", async () => {
  expect(() => requireInstabox(null)).toThrow("Add an InstaBox API key to use this computer.");
  expect(await instaboxStatus(null, "bot")).toMatchObject({ backend: "instabox", configured: false, problem: "Add an InstaBox API key to use this computer." });
  await expect(instaboxComputerAction(null, "bot", "provision", {})).rejects.toThrow("Add an InstaBox API key to use this computer.");
});

it.each([200, 400])("suspends after a successful backend switch only (status %s)", async status => {
  let bot = { id: "bot", cloudBackend: "instabox" } as BotRecord;
  const suspend = vi.fn().mockResolvedValue(undefined);
  const json = vi.fn();
  const route = withInstaboxBackendPower(async ctx => {
    if (status === 200) bot = { ...bot, cloudBackend: "box" };
    ctx.json(ctx.res, status, {});
  }, { bot: () => bot, machines: () => ({ suspend }) as unknown as InstaboxMachines });
  await route({ path: "/api/bots/bot", method: "PATCH", json } as unknown as RouteContext);
  expect(suspend).toHaveBeenCalledTimes(status === 200 ? 1 : 0);
  expect(json).toHaveBeenCalledOnce();
});


it("runs failed suspension in the background without misreporting a saved backend switch as a failed patch", async () => {
  let bot = { id: "bot", cloudBackend: "instabox" } as BotRecord;
  const json = vi.fn();
  const route = withInstaboxBackendPower(async ctx => {
    bot = { ...bot, cloudBackend: "box" };
    ctx.json(ctx.res, 200, { bot });
  }, { bot: () => bot, machines: () => null });
  await route({ path: "/api/bots/bot", method: "PATCH", json } as unknown as RouteContext);
  expect(json.mock.calls[0][1]).toBe(200);
  expect(json.mock.calls[0][2]).toMatchObject({ bot: { cloudBackend: "box" } });
});


it("sends translation keys for user errors while preserving provider failures", async () => {
  try { requireInstabox(null); }
  catch (error) {
    expect(instaboxFailureResponse(error)).toEqual({ status: 409,
      body: { error: "Add an InstaBox API key to use this computer.", errorKey: "serverError.instabox.keyMissing" } });
  }
  const service = {} as InstaboxMachines;
  await expect(instaboxComputerAction(service, "bot", "provision", { template: "apple" })).rejects.toMatchObject({ status: 400, message: "Choose a Linux or Android computer.", errorKey: "serverError.instabox.template" });
  await expect(instaboxComputerAction(service, "bot", "unsupported", {})).rejects.toMatchObject({ status: 501, message: "This InstaBox computer is unavailable.", errorKey: "serverError.instabox.unavailable" });
  const providerFailure = new Error("provider failed");
  expect(() => instaboxFailureResponse(providerFailure)).toThrow(providerFailure);
});

it("leaves the template unspecified when provisioning an existing machine", async () => {
  const ensureRunning = vi.fn().mockResolvedValue({ id: "machine", template: "android", state: "running" });
  await expect(instaboxComputerAction({ ensureRunning } as unknown as InstaboxMachines, "bot", "provision", {})).resolves.toEqual({
    ready: true, machine: { id: "machine", template: "android", state: "running" },
  });
  expect(ensureRunning).toHaveBeenCalledWith("bot", undefined);
});
