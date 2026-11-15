import { afterEach, describe, expect, it, vi } from "vitest";
import { setLocale } from "@/lib/i18n";

vi.hoisted(() => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
});

const { variantLabel } = await import("./model-picker-reasoning");

afterEach(() => setLocale("en"));

describe("a thinking choice's words", () => {
  it("are the app's own on the chat engine, in the reader's language", () => {
    expect(variantLabel({ id: "on", label: "On" }, "openai-compat")).toBe("On");
    setLocale("zh");
    expect(variantLabel({ id: "on", label: "On" }, "openai-compat")).toBe("开启");
    expect(variantLabel({ id: "off", label: "Off" }, "openai-compat")).toBe("关闭");
    expect(variantLabel({ id: "low", label: "Low" }, "openai-compat")).toBe("低");
  });

  it("stay what the model calls them when it names its own, and on other engines", () => {
    setLocale("zh");
    expect(variantLabel({ id: "deep-dive", label: "Deep Dive" }, "openai-compat")).toBe("Deep Dive");
    expect(variantLabel({ id: "low", label: "Low" }, "copilotAgent")).toBe("Low");
  });
});
