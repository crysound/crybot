// @vitest-environment happy-dom
import { act, createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { NewBotNameRequest } from "@/lib/new-bot";
import { setLocale, t } from "@/lib/i18n";
import { NewBotNameHost } from "./NewBotName";

const fixture = vi.hoisted(() => ({ ask: null as ((request: NewBotNameRequest) => Promise<string | null>) | null }));
vi.mock("@/lib/new-bot", () => ({ setNewBotNameAsker: (ask: typeof fixture.ask) => { fixture.ask = ask; } }));
let host: HTMLDivElement;
let root: Root;
const input = () => document.querySelector<HTMLInputElement>("input")!;
const key = (key: string, isComposing = false) => flushSync(() => input().dispatchEvent(new KeyboardEvent("keydown", { key, isComposing, bubbles: true, cancelable: true })));
const type = (value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(), value);
  flushSync(() => input().dispatchEvent(new Event("input", { bubbles: true })));
};
function open(randomName = vi.fn(async () => "Nova")) {
  let answer!: Promise<string | null>;
  flushSync(() => { answer = fixture.ask!({ suggestedName: "Pixel", randomName }); });
  return { answer, randomName };
}
const button = (label: string) => [...document.querySelectorAll("button")].find(button => button.textContent === label)!;

beforeEach(() => {
  setLocale("en");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root.render(createElement(NewBotNameHost)));
});
afterEach(() => { flushSync(() => root.unmount()); host.remove(); });

it("prefills and selects the suggestion, then submits a trimmed name on Enter", async () => {
  const { answer } = open();
  expect(input().value).toBe("Pixel");
  expect(document.activeElement).toBe(input());
  expect([input().selectionStart, input().selectionEnd]).toEqual([0, 5]);
  type("  Custom  ");
  key("Enter");
  expect(await answer).toBe("Custom");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("cannot submit an empty name or whitespace", async () => {
  const { answer } = open();
  for (const value of ["", "   "]) {
    type(value);
    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    key("Enter");
    flushSync(() => document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  }
  key("Escape");
  expect(await answer).toBeNull();
});

it("changes the suggestion with the random-name button and confirms it", async () => {
  const { answer, randomName } = open();
  await act(async () => button(t("newBot.anotherName")).click());
  expect(randomName).toHaveBeenCalledWith("Pixel");
  expect(input().value).toBe("Nova");
  flushSync(() => button(t("newBot.create")).click());
  expect(await answer).toBe("Nova");
});

it.each([
  ["en", "Another name", "Couldn't get another name. Try again."],
  ["zh", "换一个", "没换成，请再试一次"],
])("keeps the name and reports a failed suggestion without closing the dialog in %s", async (locale, label, error) => {
  setLocale(locale);
  const { answer } = open(vi.fn(async () => { throw new Error("offline"); }));
  await act(async () => button(label).click());
  expect(input().value).toBe("Pixel");
  expect(document.querySelector('[role="alert"]')?.textContent).toBe(error);
  expect(button(label).disabled).toBe(false);
  flushSync(() => button(t("common.cancel")).click());
  expect(await answer).toBeNull();
});

it("does not submit an IME confirmation", async () => {
  const { answer } = open();
  key("Enter", true);
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  key("Escape");
  expect(await answer).toBeNull();
});
