import { Children, createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "@/locales/en.json";

const fixture = vi.hoisted(() => ({ config: null as unknown }));
vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return { ...original, useStore: () => ({ state: { ...original.initialState, config: fixture.config }, dispatch: vi.fn() }) };
});

const { CloudBackendPicker } = await import("./CloudBackendPicker");
const picker = (value: "box" | "vps" | "instabox" = "instabox") => renderToStaticMarkup(createElement(CloudBackendPicker, { value, onChange: () => {} }));

describe("CloudBackendPicker", () => {
  afterEach(() => { fixture.config = null; });

  it("offers InstaBox or a self-hosted VPS on a desktop or self-hosted server", () => {
    fixture.config = { cloudHome: false };
    const markup = picker();
    expect(markup).toContain("Self-hosted VPS");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup.match(/<button/g)).toHaveLength(2);
    expect(markup).toContain("InstaBox");
  });

  it("is hidden on My Cloud", () => {
    fixture.config = { cloudHome: true };
    expect(picker()).toBe("");
  });

  it("keeps both cloud backends available while provider-locked", () => {
    fixture.config = { providerLock: true };
    const markup = picker("vps");
    expect(markup).toContain("Self-hosted VPS");
    expect(markup).toContain("InstaBox");
    expect(markup.match(/<button/g)).toHaveLength(2);
  });

  it.each(["box", "vps", "instabox"] as const)("offers only InstaBox and VPS whichever legacy value is chosen (%s)", (value) => {
    fixture.config = { instabox: { configured: true } };
    const markup = picker(value);
    expect(markup).toContain("InstaBox");
    expect(markup).toContain("Self-hosted VPS");
    expect(markup.match(/<button/g)).toHaveLength(2);
    expect(markup).not.toContain('disabled=""');
    expect(markup).not.toMatch(/ACP model provider/);
  });

  it("leaves no message that tells someone to switch backends for an engine", () => {
    expect(Object.keys(en)).not.toContain("computer.err.vpsEngine");
    expect(Object.values(en).filter((value) => /switch the cloud backend to Boat/i.test(value))).toEqual([]);
  });
});

it("disables InstaBox and prompts for a key even when another backend is selected", () => {
  expect(picker("vps")).toContain("Add your InstaBox key in Settings first");
  expect(picker("vps")).toContain('disabled=""');
  fixture.config = { instabox: { configured: true } };
  expect(picker("instabox")).not.toContain("Add your InstaBox key in Settings first");
});

it.each([undefined, "box"] as const)("persists InstaBox when switching from %s", value => {
  fixture.config = { instabox: { configured: true } };
  const onChange = vi.fn();
  let tree: ReactNode;
  function Capture() { tree = CloudBackendPicker({ value, onChange }); return tree; }
  const markup = renderToStaticMarkup(createElement(Capture));
  const visit = (node: ReactNode): void => {
    Children.forEach(node, child => {
      if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(child)) return;
      if (child.type === "button" && String(child.props.children).includes("InstaBox")) child.props.onClick?.();
      else visit(child.props.children);
    });
  };
  visit(tree);
  expect(onChange).toHaveBeenCalledWith("instabox");
  if (value === "box") {
    expect(markup).toContain("old cloud computer has been retired");
    expect(markup).not.toContain('aria-pressed="true"');
  } else expect(markup).toContain('aria-pressed="true"');
});
