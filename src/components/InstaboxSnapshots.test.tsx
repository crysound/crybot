// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/state/api";
import { setLocale } from "@/lib/i18n";
import { InstaboxSnapshots } from "./InstaboxSnapshots";

const fixture = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/state/api", async (original) => ({ ...await original<typeof import("@/state/api")>(), api: fixture.api }));
let host: HTMLDivElement;
let root: Root;
const snapshot = { id: "snapshot-one", name: "crybot-bot-one-backup", state: "ready", createdAt: "2026-11-15T12:34:56.000Z" };
const render = async (botId = "bot-one") => { await act(async () => root.render(<InstaboxSnapshots botId={botId} />)); };
const click = async (text: string, parent: ParentNode = host) => {
  const button = [...parent.querySelectorAll("button")].find((button) => button.textContent === text);
  expect(button).toBeDefined();
  await act(async () => button!.click());
};

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  setLocale("en");
  fixture.api.mockReset().mockResolvedValue({ snapshots: [] });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

describe("InstaBox snapshots", () => {
  it("shows the empty state and saves then refreshes", async () => {
    await render();
    expect(host.textContent).toContain("No snapshots yet");
    fixture.api.mockResolvedValueOnce({ snapshot }).mockResolvedValueOnce({ snapshots: [snapshot] });
    await click("Save a snapshot");
    expect(fixture.api).toHaveBeenCalledWith("/api/bots/bot-one/instabox/snapshots", { timeoutMs: 720_000, method: "POST", body: "{}" });
    expect(host.textContent).toContain(snapshot.name);
    expect(host.textContent).toContain(new Date(snapshot.createdAt).toLocaleString());
    expect(host.textContent).not.toContain("No snapshots yet");
  });

  it.each(["Restore snapshot", "Delete"])("requires confirmation for %s, supports cancel, then refreshes", async (label) => {
    fixture.api.mockResolvedValue({ snapshots: [snapshot] });
    await render();
    await click(label);
    expect(fixture.api).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(label === "Delete" ? "cannot be recovered" : "cold starts");
    await click("Cancel", document);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(fixture.api).toHaveBeenCalledTimes(1);
    await click(label);
    await click(label, document.querySelector('[role="alertdialog"]')!);
    expect(fixture.api).toHaveBeenCalledWith(`/api/bots/bot-one/instabox/snapshots/snapshot-one${label === "Delete" ? "" : "/restore"}`, { timeoutMs: 720_000, method: label === "Delete" ? "DELETE" : "POST" });
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    if (label === "Restore snapshot") expect(host.textContent).toContain("Snapshot restored successfully.");
    expect(fixture.api).toHaveBeenCalledTimes(3);
  });

  it("disables restore for unfinished snapshots", async () => {
    fixture.api.mockResolvedValue({ snapshots: [{ ...snapshot, state: "creating" }] });
    await render();
    expect([...host.querySelectorAll("button")].find((b) => b.textContent === "Restore snapshot")?.disabled).toBe(true);
  });

  it("shows a localized missing-key error without provider detail", async () => {
    fixture.api.mockRejectedValue(new ApiError("private-provider-detail", 503, { code: "instabox_key_missing" }));
    await render();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("InstaBox key is not set");
    expect(host.textContent).not.toContain("private-provider-detail");
  });

  it("clears a pending confirmation when switching bots and ignores the old list", async () => {
    fixture.api.mockResolvedValueOnce({ snapshots: [snapshot] });
    await render();
    await click("Delete");
    await render("bot-two");
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(host.textContent).not.toContain(snapshot.name);
    expect(fixture.api.mock.calls.at(-1)?.[0]).toBe("/api/bots/bot-two/instabox/snapshots");
  });
});

it("keeps restore success when the list refresh fails", async () => {
  fixture.api.mockResolvedValueOnce({ snapshots: [snapshot] });
  await render();
  fixture.api.mockResolvedValueOnce({ ok: true }).mockRejectedValueOnce(new Error("refresh failed"));
  await click("Restore snapshot");
  await click("Restore snapshot", document.querySelector('[role="alertdialog"]')!);
  expect(host.textContent).toContain("Snapshot restored successfully.");
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Could not refresh the snapshot list. Please try again.");
});

it.each([
  ["instabox_snapshot_busy", "Working on snapshots, please wait"],
  ["instabox_snapshot_machine_busy", "This computer is in use"],
  ["instabox_snapshot_conflict", "operation_conflict"],
])("shows the distinct %s message", async (code, text) => {
  fixture.api.mockRejectedValue(new ApiError("refused", 409, { code, reason: "operation_conflict" }));
  await render();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(text);
});
