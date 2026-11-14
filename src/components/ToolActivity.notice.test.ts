import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mode = vi.hoisted(() => ({ advanced: false }));
vi.mock("@/lib/interface-mode", () => ({ useAdvancedMode: () => mode.advanced }));

const { ToolActivity } = await import("./ToolActivity");
const { setLocale } = await import("@/lib/i18n");

const render = (tool: Parameters<typeof ToolActivity>[0]["tool"]) => renderToStaticMarkup(createElement(ToolActivity, { tool }));

const resumed = { name: "Resuming after a restart", ok: true, nameCode: "chat.notice.resumingAfterRestart" };
const { heldMemberLine } = await import("../../server/room-holds");
await import("../../server/server-line-packs");
const held = (name: string, language?: string) => ({ name: heldMemberLine(name, language), ok: false });

afterEach(() => {
  mode.advanced = false;
  setLocale("en");
});

describe("a server notice in ToolActivity", () => {
  it.each([false, true])("is worded in the person's language without its English name in the details (advanced: %s)", (advanced) => {
    mode.advanced = advanced;
    setLocale("pt-br");
    const html = render(resumed);
    expect(html).toContain("Retomando após uma reinicialização");
    expect(html).not.toContain("Resuming after a restart");
    expect(html).not.toContain('data-testid="tool-name"');
    expect(html).not.toContain("font-mono\">Retomando");
  });

  it("fills its params", () => {
    setLocale("pt-br");
    expect(render(held("Scout", "pt-br"))).toContain("O bot Scout está pausado (você o interrompeu) — mencione-o com @ ou diga retomar");
  });

  it("keeps the English for a code this build does not know or a param that is missing", () => {
    setLocale("pt-br");
    const unknown = render({ name: "A notice from a newer server", ok: true, nameCode: "chat.notice.inventedLater" });
    expect(unknown).toContain("A notice from a newer server");
    const missing = render(held("Scout"));
    expect(missing).toContain("Scout is held (stopped by you) — @mention it or say resume");
    expect(missing).not.toContain("{name}");
  });

  it("shows markup in a param as text", () => {
    setLocale("pt-br");
    const html = render(held("<img src=x onerror=alert(1)>", "pt-br"));
    expect(html).toContain("O bot &lt;img src=x onerror=alert(1)&gt; está pausado");
    expect(html).not.toContain("<img");
  });
});


it.each([["en", "Waking the computer…"], ["zh", "正在唤醒电脑…"]])("shows the computer wake notice in %s", (locale, text) => {
  setLocale(locale);
  const html = render({ name: "Waking the computer…", nameCode: "chat.notice.wakingComputer", ok: true });
  expect(html).toContain(text);
  if (locale === "zh") expect(html).not.toContain("Waking the computer…");
});

it.each([["en", "The computer could not wake for the previous turn"], ["zh", "上一轮的电脑唤醒失败"], ["fr", "The computer could not wake for the previous turn"]])("shows a late wake failure with its reason in %s", (locale, text) => {
  setLocale(locale);
  const html = render({ name: "The computer could not wake for the previous turn (desktop unavailable)",
    nameCode: "chat.notice.previousComputerWakeFailed", nameParams: { reason: "desktop unavailable" }, ok: false });
  expect(html).toContain(text);
  expect(html).toContain("desktop unavailable");
});
