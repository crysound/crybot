// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CloudAccountState } from "../../electron/cloud-account-types.mjs";
import { useCloudPlan } from "./ProIntroduction";

let root: Root, container: HTMLDivElement, result: ReturnType<typeof useCloudPlan>;
function Probe() { result = useCloudPlan(); return null; }
const render = () => act(async () => { root.render(createElement(Probe)); });
const setDesktop = (cry?: unknown) => Object.defineProperty(window, "cry", { value: cry, configurable: true });

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  setDesktop();
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  setDesktop();
  vi.unstubAllGlobals();
});

it.each([undefined, {}, { remoteClient: { active: false } }])("has no plan when the hosted bridge is absent: %j", async cry => {
  setDesktop(cry);
  await render();
  expect(result).toBeNull();
});

it("does not read an account bridge on a remote client", async () => {
  const cloudAccount = { state: vi.fn(), onState: vi.fn() };
  setDesktop({ remoteClient: { active: true }, cloudAccount });
  await render();
  expect(result).toBeNull();
  expect(cloudAccount.state).not.toHaveBeenCalled();
  expect(cloudAccount.onState).not.toHaveBeenCalled();
});

it("a newer account event wins over a delayed initial snapshot and unsubscribes on unmount", async () => {
  let resolve!: (value: CloudAccountState) => void;
  let push!: (value: CloudAccountState) => void;
  const unsubscribe = vi.fn();
  setDesktop({ cloudAccount: {
    state: () => new Promise<CloudAccountState>(done => { resolve = done; }),
    onState: (listener: typeof push) => { push = listener; return unsubscribe; },
  } });
  await render();
  expect(result?.view).toEqual({ kind: "unknown" });
  await act(async () => { push({ status: "signed-out" }); });
  await act(async () => { resolve({ status: "connected" }); });
  expect(result).toEqual({ view: { kind: "signed-out" }, account: { status: "signed-out" } });
  await act(async () => { root.render(null); });
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it("a rejected account snapshot stays unknown", async () => {
  setDesktop({ cloudAccount: { state: vi.fn().mockRejectedValue(new Error("disabled")), onState: () => () => {} } });
  await render();
  expect(result).toEqual({ view: { kind: "unknown" }, account: null });
});
