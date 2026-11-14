import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSettingsSection } from "@/state/store";
import { SettingsModal } from "./SettingsModal";

const fixture = vi.hoisted(() => ({ section: "cloudAccount" as AppSettingsSection, config: undefined as { cloudHome?: boolean } | undefined, advanced: false }));
vi.mock("@/lib/interface-mode", () => ({ useAdvancedMode: () => fixture.advanced, setAdvancedMode: vi.fn() }));
vi.mock("./DesktopCapabilities", () => ({ useDesktopCapabilities: () => ({ capabilities: {} }) }));
vi.mock("@/state/store", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/state/store")>(),
  api: vi.fn(),
  useStore: () => ({ state: { appSettingsSection: fixture.section, config: fixture.config, instances: [], bots: [], appSettingsCloudLink: 0 }, dispatch: vi.fn() }),
}));

const plan = { state: vi.fn(), manage: vi.fn() };
beforeEach(() => {
  fixture.section = "cloudAccount"; fixture.config = undefined;
  vi.stubGlobal("document", { documentElement: { dataset: {} } });
});
afterEach(() => { vi.unstubAllGlobals(); });
const render = () => renderToStaticMarkup(createElement(SettingsModal));

describe.each(["Simple", "Advanced"] as const)("%s Settings → Plan & billing on a server open in the app's window", (mode) => {
  beforeEach(() => { fixture.advanced = mode === "Advanced"; });
  const reachable = 'data-settings-page="plan"';
  it("is not offered on a server that is not a Cloud home", () => {
    vi.stubGlobal("window", { cry: { cloudPlan: plan } });
    const html = render();
    expect(html).not.toContain(reachable);
  });
  it("has no hosted plan entry on a local or home page even with an old bridge", () => {
    for (const config of [undefined, { cloudHome: true }]) {
      fixture.config = config;
      vi.stubGlobal("window", { cry: { cloudAccount: {}, cloudPlan: plan } });
      const html = render();
      expect(html).not.toContain(reachable);
      expect(html).not.toContain('data-settings-page-open="plan"');
    }
  });
});
