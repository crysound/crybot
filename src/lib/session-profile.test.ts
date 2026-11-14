// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { personTagNames } from "../../shared/person-mention";
import { useSessionDisplayName } from "./session-profile";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("shares the current session name across consumers and uses it for self mentions", async () => {
  let answer!: (response: Response) => void;
  const fetch = vi.fn(() => new Promise<Response>((resolve) => { answer = resolve; }));
  vi.stubGlobal("fetch", fetch);
  const host = document.createElement("div");
  const root = createRoot(host);
  function Names() {
    const name = useSessionDisplayName() ?? "Local profile";
    return createElement("span", null, personTagNames(name).join(","));
  }
  try {
    await act(async () => root.render(createElement("div", null, createElement(Names), createElement(Names))));
    expect([...host.querySelectorAll("span")].map((span) => span.textContent)).toEqual(["you,Local profile", "you,Local profile"]);
    await act(async () => answer(new Response(JSON.stringify({ kind: "session", id: "s", label: "Safari on iPhone", displayName: " 张三 ", scopes: ["admin"], expiresAt: 1 }))));
    expect([...host.querySelectorAll("span")].map((span) => span.textContent)).toEqual(["you,张三", "you,张三"]);
    expect(fetch).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount());
    vi.unstubAllGlobals();
  }
});
