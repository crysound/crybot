// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { IslandSettings } from "./IslandSettings";
import { setLocale } from "../lib/i18n";
const fixture = vi.hoisted(() => ({ platform: "darwin" }));
vi.mock("./DesktopCapabilities", () => ({ useDesktopCapabilities: () => ({ capabilities: { host: { platform: fixture.platform } } }) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it("macOS settings default on, save changes through the bridge and stay absent elsewhere", async () => {
  setLocale("zh");
  let saved = { enabled: true, fullscreen: true, width: 200 };
  const set = vi.fn(async change => { saved = { ...saved, ...change }; return saved; });
  Object.assign(window, { cry: { islandSettings: { state: async () => saved, set } } });
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  try {
    await act(async () => root.render(createElement(IslandSettings)));
    const buttons = host.querySelectorAll<HTMLButtonElement>('button[role="switch"]');
    expect([...buttons].map(button => button.getAttribute("aria-checked"))).toEqual(["true", "true"]);
    expect(host.textContent).toContain("显示灵动岛"); expect(host.textContent).toContain("全屏应用时也显示");
    await act(async () => buttons[0].click()); expect(set).toHaveBeenCalledWith({ enabled: false });
    fixture.platform = "linux"; await act(async () => root.render(createElement(IslandSettings))); expect(host.textContent).toBe("");
  } finally { await act(async () => root.unmount()); host.remove(); delete (window as { cry?: unknown }).cry; fixture.platform = "darwin"; }
});

it("width previews locally and persists once on release, including keyboard changes", async () => {
  let saved = { enabled: true, fullscreen: true, width: 200 };
  const set = vi.fn(async change => { saved = { ...saved, ...change }; return saved; });
  Object.assign(window, { cry: { islandSettings: { state: async () => saved, set } } });
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  const input = (value: string) => {
    const slider = host.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(slider, value);
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  };
  try {
    await act(async () => root.render(createElement(IslandSettings)));
    await act(async () => input("240")); await act(async () => input("260"));
    expect(host.querySelector("output")?.textContent).toBe("260px"); expect(set).not.toHaveBeenCalled();
    await act(async () => host.querySelector("input")!.dispatchEvent(new Event("pointerup", { bubbles: true })));
    expect(set).toHaveBeenCalledExactlyOnceWith({ width: 260 });
    await act(async () => input("270"));
    await act(async () => host.querySelector("input")!.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "ArrowRight" })));
    expect(set).toHaveBeenLastCalledWith({ width: 270 }); expect(set).toHaveBeenCalledTimes(2);
  } finally { await act(async () => root.unmount()); host.remove(); delete (window as { cry?: unknown }).cry; }
});

it("restores the saved width when persisting a preview fails", async () => {
  const saved = { enabled: true, fullscreen: true, width: 200 };
  const set = vi.fn().mockRejectedValue(new Error("inactive page"));
  Object.assign(window, { cry: { islandSettings: { state: async () => saved, set } } });
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  try {
    await act(async () => root.render(createElement(IslandSettings)));
    const slider = host.querySelector<HTMLInputElement>("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(slider, "260");
    await act(async () => slider.dispatchEvent(new Event("input", { bubbles: true })));
    expect(host.querySelector("output")?.textContent).toBe("260px");
    await act(async () => slider.dispatchEvent(new Event("pointerup", { bubbles: true })));
    expect(slider.value).toBe("200");
    expect(host.querySelector("output")?.textContent).toBe("200px");
  } finally { await act(async () => root.unmount()); host.remove(); delete (window as { cry?: unknown }).cry; }
});
