// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readSessionState, type SessionState } from "@/lib/session";
import { api } from "@/state/store";
import { useServerUpdate } from "./ServerUpdateRow";

vi.mock("@/lib/session", () => ({ readSessionState: vi.fn() }));
vi.mock("@/state/store", () => ({ api: vi.fn(), useStore: () => ({ state: { connected: true } }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let host: HTMLDivElement;
let update: ReturnType<typeof useServerUpdate>;
const check = { current: "1.0.0", latest: "1.0.1", available: true, install: "npm" };
const status = { current: "1.0.0", mode: "button" };
const admin: SessionState = { kind: "session", id: "fixture", label: "Fixture", scopes: ["admin"], expiresAt: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  host = document.createElement("div");
  root = createRoot(host);
  vi.mocked(api).mockImplementation(async path => path === "/api/updates/check" ? check : status);
});
afterEach(async () => { await act(async () => root.unmount()); });
function Probe() { update = useServerUpdate(); return null; }
const mount = () => act(async () => root.render(createElement(Probe)));
const statusCalls = () => vi.mocked(api).mock.calls.filter(([path]) => path === "/api/updates/server");

it.each<SessionState>([{ kind: "loopback" }, { ...admin, scopes: ["chat"] }, { kind: "unreachable", error: "offline" }])("does not ask for admin update state with $kind", async session => {
  vi.mocked(readSessionState).mockResolvedValue(session);
  await mount();
  expect(update.check).toEqual(check);
  expect(statusCalls()).toHaveLength(0);
  await act(async () => { await update.load(); });
  expect(statusCalls()).toHaveLength(0);
});

it("reads update state for a session with admin scope", async () => {
  vi.mocked(readSessionState).mockResolvedValue(admin);
  await mount();
  expect(statusCalls()).toHaveLength(1);
  expect(update.status).toEqual(status);
});

it("does not ask again after admin_only, including a remount", async () => {
  vi.mocked(readSessionState).mockResolvedValue(admin);
  vi.mocked(api).mockImplementation(async path => {
    if (path === "/api/updates/check") return check;
    throw { status: 403, body: { code: "admin_only" } };
  });
  await mount();
  await act(async () => { await update.load(); });
  await act(async () => root.render(null));
  await mount();
  expect(statusCalls()).toHaveLength(1);
  expect(update.status).toBeNull();
});
