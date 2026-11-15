import { describe, expect, it } from "vitest";

import { hasSetupChoices, initialGreeting, initialGreetingMessage, setupChoices, setupRequestLine } from "./initial-greeting.ts";

describe("the line after Set me up", () => {
  it("is written in the app's language, by region, with English for any other", () => {
    expect(setupRequestLine("en")).toBe(
      "Great. Tell me what you'd like help with, in your own words, and I'll set myself up for it. For example: \"sort my inbox every morning\" or \"research our competitors every week\".",
    );
    expect(setupRequestLine("es-MX")).toBe(setupRequestLine("en"));
    expect(setupRequestLine("zh")).toMatch(/^好的。/);
    expect(setupRequestLine("fr")).toBe(setupRequestLine("en"));
    expect(setupRequestLine(undefined)).toBe(setupRequestLine("en"));
  });

  it("leaves the greeting itself as it was", () => {
    expect(initialGreeting("Ava", "en")).toBe("Hi, I'm Ava. What would you like me to do?");
  });
});

describe("a new bot's greeting", () => {
  it("names the person by their first name, in the app's language", () => {
    expect(initialGreeting("Scout", "en", "Alex Morgan")).toBe("Hi Alex, I'm Scout. What would you like me to do?");
    expect(initialGreeting("Scout", "es-MX", "  Ana  María ")).toBe("Hi Ana, I'm Scout. What would you like me to do?");
    expect(initialGreeting("Scout", "zh", "João")).toBe("你好 João，我是 Scout。你想让我帮你做什么？");
    expect(initialGreeting("Scout", "zh-TW", "王小明")).toBe("你好 王小明，我是 Scout。你想让我帮你做什么？");
    expect(initialGreeting("Scout", "zh-Hant")).toBe("你好，我是 Scout。你想让我帮你做什么？");
  });

  it("names no one when the person has not given a name", () => {
    for (const person of [undefined, "", "   "]) {
      expect(initialGreeting("Scout", "en", person)).toBe("Hi, I'm Scout. What would you like me to do?");
    }
  });
});

it.each(["zh", "zh-cn", "zh-hans", "zh-sg", "ZH-CN"])("seeds Simplified Chinese for %s", (language) => {
  expect(initialGreetingMessage("Fixture", language, true)).toMatchObject({
    text: "你好，我是 Fixture。你想让我帮你做什么？",
    setupOffer: true,
    setupChoices: ["研究与深入探索主题", "帮我留意各种事情", "电子邮件、日历和消息", "预约、购物和跑腿", "数据、电子表格和报告"],
  });
  expect(setupRequestLine(language)).toContain("收件箱");
  expect(setupChoices(language)).toEqual(setupChoices("zh"));
});

it.each(["es", "de", "ar"])("asks the model for setup choices in %s", (language) => {
  expect(hasSetupChoices(language)).toBe(false);
});
it.each([undefined, "en", "en-US", "zh", "zh-TW"])("has fixed setup choices for %s", (language) => {
  expect(hasSetupChoices(language)).toBe(true);
});
