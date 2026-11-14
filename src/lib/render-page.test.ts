// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { renderPage } from "./render-page";

let root: Root | undefined;
afterEach(() => {
  root?.unmount();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.doUnmock("@/locales");
  vi.resetModules();
});

it.each(["en", "zh"])("shows an English retry page when all packs fail for %s, then boots after reload", async (tag) => {
  vi.resetModules();
  let offline = true;
  const requested: string[] = [];
  vi.doMock("@/locales", async (original) => {
    const real = await original<typeof import("@/locales")>();
    return { ...real, loadLocalePack: (name: string) => {
      requested.push(name);
      return offline ? Promise.reject(new Error("offline")) : real.loadLocalePack(name);
    } };
  });
  const page = await import("./i18n");
  const packs = await import("@/locales");
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const boot = () => renderPage(root!, async () => {
    await page.loadLocale(tag);
    return createElement("main", null, page.t("rail.thisComputer"));
  });
  await act(boot);
  expect(requested).toContain("en");
  expect(Object.keys(packs.en)).toEqual([]);
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Couldn't load this page");
  expect(host.querySelector("main")).toBeNull();
  const retry = host.querySelector("button")!;
  expect(retry.textContent).toBe("Retry");
  offline = false;
  let reboot: Promise<void> | undefined;
  const reload = vi.spyOn(window.location, "reload").mockImplementation(() => {
    root!.unmount();
    root = createRoot(host);
    reboot = boot();
  });
  await act(async () => { retry.click(); await reboot; });
  expect(reload).toHaveBeenCalledOnce();
  expect(host.querySelector('[role="alert"]')).toBeNull();
  expect(host.querySelector("main")?.textContent).toBe(page.t("rail.thisComputer"));
});
