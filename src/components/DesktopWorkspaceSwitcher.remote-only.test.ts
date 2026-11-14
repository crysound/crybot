import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { DesktopWorkspaceSwitcher, useWorkspacePlace } from "./DesktopWorkspaceSwitcher";
import { SidebarProfileMenu } from "./SidebarProfileMenu";
import type { SidebarMenuItem } from "./SidebarPopoverMenu";

vi.mock("@/state/store", () => ({ useStore: () => ({ state: { config: {}, routines: [], webhooks: [], routineRuns: [], bots: [] }, dispatch: vi.fn() }) }));
vi.mock("./SidebarPopoverMenu", () => ({ SidebarPopoverMenu: ({ items }: { items: SidebarMenuItem[] }) =>
  items.map(item => createElement("button", { key: item.key, onClick: item.onSelect }, item.label)) }));

const mainSource = readFileSync(new URL("../../electron/main.mjs", import.meta.url), "utf8");
const preloadSource = readFileSync(new URL("../../electron/preload.cjs", import.meta.url), "utf8");

afterEach(() => vi.unstubAllGlobals());

it.each([false, true])("exposes switching in the server renderer only when remoteOnly is off (%s)", remoteOnly => {
  const argumentsExpression = /additionalArguments: (\[[\s\S]*?\]),\r?\n/.exec(mainSource)?.[1];
  expect(argumentsExpression).toBeDefined();
  const argv = vm.runInNewContext(argumentsExpression!, {
    desktopBuild: { remoteOnly }, desktopRemoteAccess: null,
    desktopCompanionRendererArguments: () => ["--cry-local-origin=http://localhost:8799"], rendererOrigin: () => "http://localhost:8799",
    app: { isPackaged: true, getVersion: () => "1.0.0" }, linuxSoftwareRendering: false,
  });
  const menu = vi.fn().mockResolvedValue(undefined);
  const context = vm.createContext({
    process: { argv, platform: "darwin" }, location: { origin: "https://gateway.example", pathname: "/chat" },
    require: () => ({
      contextBridge: { exposeInMainWorld: (name: string, api: unknown) => { vi.stubGlobal("window", { [name]: api, location: { host: "gateway.example" } }); } },
      ipcRenderer: { on() {}, sendSync: () => false, invoke: menu },
    }),
  });
  vm.runInContext(preloadSource, context);
  expect(Boolean(window.cry?.workspaces)).toBe(!remoteOnly);
  for (const props of [{}, { compact: true }, { inline: true }, { inline: true, pill: true }, { rail: true }, { cloudHome: true }]) {
    const html = renderToStaticMarkup(createElement(DesktopWorkspaceSwitcher, props));
    expect(html.includes('data-tour="server-switcher"'), JSON.stringify(props)).toBe(!remoteOnly);
    expect(html.includes('aria-haspopup="menu"'), JSON.stringify(props)).toBe(!remoteOnly);
  }
  function ProfilePlaces() {
    const place = useWorkspacePlace({});
    return createElement<NonNullable<Parameters<typeof SidebarProfileMenu>[0]>>(SidebarProfileMenu,
      { simple: { place, owner: null, automationsNeedYou: false } });
  }
  const profile = renderToStaticMarkup(createElement(ProfilePlaces));
  expect(profile.includes("Switch place")).toBe(!remoteOnly);
  expect(menu).not.toHaveBeenCalled();
});
