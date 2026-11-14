import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { setLocale, t } from "@/lib/i18n";

const fixture = vi.hoisted(() => ({ providerLock: false }));
vi.mock("@/state/store", () => ({
  useStore: () => ({ state: { config: { providerLock: fixture.providerLock } }, dispatch: vi.fn() }),
  api: vi.fn(),
}));

import { CanvasComputers } from "./CanvasComputers";

it.each([false, true])("renders the Boat shelf only without provider lock: %s", (providerLock) => {
  fixture.providerLock = providerLock;
  setLocale("en");
  const html = renderToStaticMarkup(createElement(CanvasComputers, {
    open: true, createRequest: 0, drop: null, sections: [],
    onClose: vi.fn(), onDropHandled: vi.fn(), onChange: vi.fn(),
  }));
  expect(html.includes(t("canvasComputers.newCloud"))).toBe(!providerLock);
  if (providerLock) expect(html).toBe("");
});
