import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import type { Bot, InstanceInfo } from "@/state/store";

vi.stubGlobal("window", {});
const fixture = vi.hoisted(() => ({ config: null as unknown, menuOpen: false, computerMcp: true, localReason: undefined as string | undefined }));
// Static markup never runs the click that opens the menu; this renders it open.
vi.mock("./MenuMotion", async (importOriginal) => ({
  ...await importOriginal<typeof import("./MenuMotion")>(),
  useMenuMotion: () => ({ shown: fixture.menuOpen, closing: false, className: "", exitProps: {} }),
}));
vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return {
    ...original,
    useStore: () => ({
      state: {
        ...original.initialState,
        config: fixture.config ?? original.initialState.config,
        instances: [{
          instanceId: "test",
          driverKind: "grokAgent",
          displayName: "Grok",
          snapshot: { state: "available" },
          capabilities: { computerMcp: fixture.computerMcp, browserMcp: true },
        } as InstanceInfo],
      },
      dispatch: vi.fn(),
    }),
  };
});
vi.mock("./DesktopCapabilities", async (importOriginal) => ({
  ...await importOriginal<typeof import("./DesktopCapabilities")>(),
  useDesktopCapabilities: () => ({
    capabilities: {
      dictation: { available: false },
      host: { packaged: true, platform: "darwin" },
      localComputer: fixture.localReason
        ? { available: false, support: "unsupported", enabled: false, status: "unavailable", reasonCode: fixture.localReason }
        : { available: true, support: "supported", enabled: true, status: "enabled" },
    },
    ready: true,
  }),
}));

const { PlaceChip, usePlaceAvailability, usePlaceMenuItem } = await import("./PlaceChip");
afterAll(() => vi.unstubAllGlobals());

const bot = {
  id: "bot",
  threadId: "thread",
  name: "Rio",
  title: "",
  description: "",
  color: "green",
  notifications: true,
  unread: false,
  busy: false,
  messages: [],
  computer: "local",
  modelSelection: { instanceId: "test", model: "grok-4.6" },
} as Bot;

describe("PlaceChip composer trigger", () => {
  it("is icon-only, with the place name in the accessible name and tooltip", () => {
    const html = renderToStaticMarkup(createElement(PlaceChip, {
      bot,
      live: false,
      onPin: () => {},
    } satisfies ComponentProps<typeof PlaceChip>));
    expect(html).toContain('data-testid="place-chip"');
    expect(html).toContain('aria-label="Where this conversation works: This computer"');
    expect(html).toContain("This computer — From this bot&#x27;s Works on setting");
    expect(html).not.toMatch(/<span class="truncate">This computer<\/span>/);
  });
});

describe("the menu's first row", () => {
  afterEach(() => { fixture.menuOpen = false; });
  const rows = (props: Partial<ComponentProps<typeof PlaceChip>>) => {
    fixture.menuOpen = true;
    const html = renderToStaticMarkup(createElement(PlaceChip, { bot, live: false, onPin: () => {}, ...props }));
    return {
      html,
      rows: html.split('role="menuitemradio"').slice(1).map((row) => ({
        checked: row.startsWith(' aria-checked="true"'),
        text: row.slice(row.indexOf(">") + 1, row.indexOf("</button>"))
          .replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim(),
      })),
    };
  };

  it("is Auto itself for a bot on Auto, selected while the conversation has no pin", () => {
    const { html, rows: menu } = rows({ bot: { ...bot, computer: undefined } });
    expect(menu[0]).toEqual({ checked: true, text: "Auto Picks the right place for each task" });
    expect(html).not.toContain("Follow this bot");
    expect(html).toContain('aria-label="Where this conversation works: Auto"');
    expect(menu).toHaveLength(5);
    expect(menu.filter((row) => row.text.startsWith("Auto"))).toHaveLength(1);
  });

  it("stays Auto, unchecked, when the conversation is pinned elsewhere", () => {
    const { html, rows: menu } = rows({ bot: { ...bot, computer: undefined }, task: { surface: "vm" } });
    expect(menu[0]).toEqual({ checked: false, text: "Auto Picks the right place for each task" });
    expect(menu.find((row) => row.checked)?.text).toBe("Private desktop Isolated local desktop");
    expect(html).toContain('aria-label="Where this conversation works: Private desktop"');
  });

  it("keeps Auto checked for the place Auto picked, which is no pin of the person's", () => {
    const { html, rows: menu } = rows({ bot: { ...bot, computer: undefined }, task: { surface: "browser", surfaceAuto: true } });
    expect(menu[0]).toEqual({ checked: true, text: "Auto Picks the right place for each task" });
    expect(menu.filter((row) => row.checked)).toHaveLength(1);
    expect(html).toContain('aria-label="Where this conversation works: Browser"');
    expect(html).toContain("Browser — From this bot&#x27;s Works on setting");
    expect(html).not.toContain("text-accent hover:text-accent");
  });

  it("keeps following the bot's setting when the bot works on a specific place", () => {
    const { html, rows: menu } = rows({ bot: { ...bot, computer: "local" } });
    expect(menu[0]).toEqual({ checked: true, text: "Follow this bot's setting Currently This computer" });
    expect(html).not.toContain("Picks the right place for each task");
  });
});

describe("the phone's place menu", () => {
  it("keeps Auto checked for the place Auto picked, and still lets the person pin that place", () => {
    const onPin = vi.fn();
    let item: ReturnType<typeof usePlaceMenuItem> | undefined;
    function Probe() {
      item = usePlaceMenuItem({ bot: { ...bot, computer: undefined }, task: { surface: "browser", surfaceAuto: true }, onPin });
      return null;
    }
    renderToStaticMarkup(createElement(Probe));
    const menu = item!.submenu!;
    expect(menu.filter((row) => row.active).map((row) => row.key)).toEqual(["place:follow"]);
    menu.find((row) => row.key === "place:browser")!.onSelect();
    expect(onPin).toHaveBeenCalledWith("browser");
  });
});

describe("another server's page", () => {
  afterEach(() => { fixture.menuOpen = false; fixture.localReason = undefined; });
  const labels = (items: { label: unknown }[]) => items.map((item) => item.label);

  it("leaves This computer out of the chip menu and the phone submenu", () => {
    fixture.localReason = "remote-server";
    fixture.menuOpen = true;
    const html = renderToStaticMarkup(createElement(PlaceChip, { bot: { ...bot, computer: undefined }, live: false, onPin: () => {} }));
    const rows = html.split('role="menuitemradio"').slice(1);
    expect(rows).toHaveLength(4);
    expect(rows.some((row) => row.includes("This computer"))).toBe(false);

    let submenu: { label: unknown }[] = [];
    function Probe() { submenu = usePlaceMenuItem({ bot, onPin: () => {} }).submenu ?? []; return null; }
    renderToStaticMarkup(createElement(Probe));
    expect(labels(submenu)).not.toContain("This computer");
    expect(submenu).toHaveLength(4);
  });

  it("still lists This computer on a desktop", () => {
    let submenu: { label: unknown }[] = [];
    function Probe() { submenu = usePlaceMenuItem({ bot, onPin: () => {} }).submenu ?? []; return null; }
    renderToStaticMarkup(createElement(Probe));
    expect(labels(submenu)).toContain("This computer");
  });
});

describe("the places a conversation can be pinned to", () => {
  const availability = () => {
    let seen: ReturnType<typeof usePlaceAvailability> | undefined;
    function Probe() { seen = usePlaceAvailability(bot); return null; }
    renderToStaticMarkup(createElement(Probe));
    return seen!;
  };
  afterEach(() => { fixture.config = null; });

  it("reaches this computer and a Local VM on a desktop or self-hosted server", () => {
    expect(availability()).toMatchObject({ cloud: true, vm: true, local: true });
  });

  it("never reaches them on an CRY Cloud home", () => {
    fixture.config = { cloudHome: true };
    expect(availability()).toMatchObject({ cloud: true, vm: false, local: false });
  });
});

describe("provider-locked place menus", () => {
  afterEach(() => { fixture.config = null; fixture.menuOpen = false; });

  it.each([false, true])("hides Boat in desktop and phone menus only while locked: %s", (providerLock) => {
    fixture.config = { providerLock, box: { configured: false } };
    fixture.menuOpen = true;
    const cloudBot = { ...bot, computer: "cloud" as const, cloudBackend: "box" as const };
    const html = renderToStaticMarkup(createElement(PlaceChip, { bot: cloudBot, live: false, onPin: vi.fn() }));
    expect(html.includes("Cloud desktop")).toBe(!providerLock);
    expect(html.includes("Connect Boat first")).toBe(!providerLock);
    expect(html).toContain("Private desktop");
    expect(html).toContain("This computer");
    let item: ReturnType<typeof usePlaceMenuItem> | undefined;
    function Probe() { item = usePlaceMenuItem({ bot: cloudBot, onPin: vi.fn() }); return null; }
    renderToStaticMarkup(createElement(Probe));
    expect(item!.submenu!.some((row) => row.key === "place:cloud")).toBe(!providerLock);
    if (providerLock) expect(JSON.stringify(item)).not.toMatch(/Boat|Cloud desktop/);
  });

  it("keeps a configured VPS reachable while locked", () => {
    fixture.config = { providerLock: true };
    let item: ReturnType<typeof usePlaceMenuItem> | undefined;
    const onPin = vi.fn();
    function Probe() { item = usePlaceMenuItem({ bot: { ...bot, cloudBackend: "vps" }, onPin }); return null; }
    renderToStaticMarkup(createElement(Probe));
    const cloud = item!.submenu!.find((row) => row.key === "place:cloud")!;
    expect(cloud.disabled).toBe(false);
    cloud.onSelect();
    expect(onPin).toHaveBeenCalledWith("cloud");
  });
});

describe("J11: the chip names a place's problem in the panel's words", () => {
  afterEach(() => { fixture.menuOpen = false; fixture.computerMcp = true; });

  it("greys out the cloud desktop for a model that can't use one, with the same few words and line", () => {
    fixture.computerMcp = false;
    fixture.menuOpen = true;
    const html = renderToStaticMarkup(createElement(PlaceChip, { bot, live: false, onPin: () => {} }));
    const row = html.split('role="menuitemradio"').slice(1).find((entry) => entry.includes("Cloud desktop"))!;
    expect(row).toContain('disabled=""');
    expect(row).toContain("Not with this model");
    expect(row).toContain("title=\"grok-4.6 can&#x27;t use a desktop. Choose a model that can, such as Claude or ChatGPT.\"");
  });
});

it.each([
  ["shared", 4, "A screen in a shared container"],
  ["shared", 1, "Isolated local desktop"],
  ["shared", undefined, "Isolated local desktop"],
  ["per-bot", 4, "Isolated local desktop"],
] as const)("describes the VM choice for %s with %s screens", async (mode, screens, description) => {
  fixture.config = { localVm: { mode, screens, maxInstances: 1 } };
  fixture.menuOpen = true;
  const html = renderToStaticMarkup(createElement(PlaceChip, { bot, live: false, onPin: vi.fn() }));
  expect(html).toContain(description);
  let note: string | undefined;
  function Menu() {
    note = usePlaceMenuItem({ bot, onPin: vi.fn() }).submenu?.find(item => item.key === "place:vm")?.note as string | undefined;
    return null;
  }
  renderToStaticMarkup(createElement(Menu));
  expect(note).toBe(description);
  const { worksOnChoices } = await import("./WorksOnGrid");
  const { t } = await import("@/lib/i18n");
  const choice = worksOnChoices({ localVm: { mode, screens, maxInstances: 1 } }, {} as DesktopCapabilities).find(([place]) => place === "vm")!;
  expect(t(choice[2])).toBe(description);
});
