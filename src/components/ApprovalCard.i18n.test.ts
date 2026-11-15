import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { setLocale } from "@/lib/i18n";
import { StoreProvider, type Bot, type Message } from "@/state/store";
import { ApprovalCard } from "./ApprovalCard";
import {
  PendingApprovalActions,
  PendingApprovalPanel,
  spokenApprovalPrompt,
  type Pending,
} from "./PendingApproval";

function commandApproval(answered?: "allow" | "deny"): { message: Message; pending: Pending } {
  const message: Message = {
    id: "approval-card",
    role: "bot",
    kind: "options",
    at: 1,
    card: {
      title: "Approval needed",
      subtitle: "pnpm test",
      options: ["Allow", "Deny"],
      answered,
      requestId: "approval-request",
      tool: "Bash",
    },
  };
  return {
    message,
    pending: {
      message,
      requestId: "approval-request",
      tool: "Bash",
      allowKey: "Bash:pnpm test",
      detail: "pnpm test",
    },
  };
}

afterEach(() => {
  setLocale("en");
});

describe("Chinese approval cards", () => {
  it("renders a pending command approval in Chinese", () => {
    setLocale("zh");
    const { message } = commandApproval();

    const markup = renderToStaticMarkup(createElement(ApprovalCard, {
      bot: { name: "Mochi" } as Bot,
      message,
    }));

    expect(markup).toContain("Mochi 想执行命令");
    expect(markup).toContain('class="sr-only"');
    expect(markup).toContain("正在等待你在下方回答");
  });

  it("renders a denied command approval in Chinese", () => {
    setLocale("zh");
    const { message } = commandApproval("deny");

    const markup = renderToStaticMarkup(createElement(ApprovalCard, { message }));

    expect(markup).toContain("已拒绝");
  });

  it("renders the pending approval strip in Chinese", () => {
    setLocale("zh");
    const { pending } = commandApproval();

    const markup = renderToStaticMarkup(createElement(PendingApprovalPanel, {
      pending,
      count: 3,
      index: 1,
    }));

    expect(markup).toContain('aria-label="待批准"');
    expect(markup).toContain("待批准");
    expect(markup).toContain("第 2 / 3 条");
    expect(markup).toContain("请求批准命令");
    expect(markup).toContain('aria-label="待查看的批准详情"');
  });

  it("speaks a command approval in Chinese", () => {
    setLocale("zh");
    const { pending } = commandApproval();

    expect(spokenApprovalPrompt(pending, "Mochi")).toBe(
      "Mochi 想执行命令。pnpm test。我要允许吗？",
    );
  });

  it("renders command approval actions in Chinese", () => {
    setLocale("zh");
    const { pending } = commandApproval();

    const markup = renderToStaticMarkup(createElement(
      StoreProvider,
      null,
      createElement(PendingApprovalActions, {
        pending,
        threadId: "thread-1",
        bot: { id: "bot-1", name: "Mochi" } as Bot,
        onCancelTurn: () => undefined,
      }),
    ));

    expect(markup).toContain("取消本轮");
    expect(markup).toContain("拒绝");
    expect(markup).toContain("始终允许");
    expect(markup).toContain("允许一次");
    expect(markup).toContain("不再就 Bash:pnpm test 询问 Mochi");
  });
});

describe("localized structured approval actions", () => {
  it.each([
    ["enable", "Turn on", "开启"],
    ["update", "Change", "更改"],
    ["remove", "Remove", "移除"],
  ] as const)("localizes the spoken and visible MCP %s actions while preserving wire options", (action, english, chinese) => {
    const { pending } = commandApproval();
    const card = pending.message.card!;
    card.title = `${english} linear?`;
    card.options = [english];
    card.mcpRequest = { requestId: "mcp-request", botId: "bot-1", threadId: "thread-1", action, name: "linear", targetHash: "0".repeat(64) };
    expect(spokenApprovalPrompt(pending, "Mochi")).toBe(`Mochi: ${english} linear? Review the details and choose ${english} or Cancel.`);
    setLocale("zh");
    card.title = `${chinese} linear?`;
    expect(spokenApprovalPrompt(pending, "Mochi")).toBe(`Mochi：${chinese} linear? 请查看详情，选择「${chinese}」或「取消」。`);
    const markup = renderToStaticMarkup(createElement(StoreProvider, null, createElement(PendingApprovalActions, {
      pending, threadId: "thread-1", onCancelTurn: () => undefined,
    })));
    expect(markup).toContain(`>${chinese}</button>`);
    expect(markup).toContain(">取消</button>");
    expect(card.options).toEqual([english]);
  });

  it.each([
    [false, "Apply setup", "应用设置"],
    [true, "Delete bot", "删除智能体"],
  ] as const)("localizes team setup actions with deletion=%s without translating wire options", (deletion, english, chinese) => {
    const { pending } = commandApproval();
    const card = pending.message.card!;
    card.title = "Review this change?";
    card.options = [english, "Cancel"];
    card.teamSetupRequest = {
      version: 1, requestId: "team-request", botId: "bot-1", threadId: "thread-1", reason: "Team update", createdAt: 1,
      requesterRevision: "rev-1", operations: [], newTeams: [],
      ...(deletion ? { deletion: { botId: "bot-2", name: "Scout", expectedRevision: "rev-2" } } : {}),
    };
    expect(spokenApprovalPrompt(pending, "Mochi")).toBe(`Mochi: Review this change? Review the details and choose ${english} or Cancel.`);
    setLocale("zh");
    card.title = "Revisar esta alteração?";
    expect(spokenApprovalPrompt(pending, "Mochi")).toBe(`Mochi：Revisar esta alteração? 请查看详情，选择「${chinese}」或「取消」。`);
    const markup = renderToStaticMarkup(createElement(StoreProvider, null, createElement(PendingApprovalActions, {
      pending, threadId: "thread-1", onCancelTurn: () => undefined,
    })));
    expect(markup).toContain(`>${chinese}</button>`);
    expect(markup).toContain(">取消</button>");
    expect(card.options).toEqual([english, "Cancel"]);
  });

});
