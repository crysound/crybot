import { computerFreeAfterText, computerParkedText, computerStoppedWaitingText, computerWaitingText } from "./computer-wait.ts";
import type { ComputerHolder } from "./computer-wait.ts";
import { noticeTool } from "./chat-notices.ts";
import type { WireMessage } from "../shared/wire.ts";
import type { TurnOwner } from "./turn-resources.ts";

export const COMPUTER_WAIT_MAX_MS = Math.max(1_000, Number(process.env.CRYBOT_COMPUTER_WAIT_MAX_MS) || 30 * 60_000);
export class ComputerWaitParked extends Error {
  readonly resource: string;
  readonly generation: string;
  constructor(message: string, resource: string, generation: string) {
    super(message);
    this.resource = resource;
    this.generation = generation;
  }
}

export interface ComputerQueue {
  claim(): boolean;
  position(): number;
  estimateMs(): number | null | undefined;
  holder?(): { holder?: ComputerHolder; threadRef?: { botId: string; threadId: string; title: string } };
  finish(): void;
  acquired?(waitedMs: number): void;
}

export interface ComputerWaitHooks {
  active(owner: TurnOwner): boolean;
  cancelled(): Error;
  row(threadId: string, tool: string | NonNullable<WireMessage["tool"]>, threadRef?: { botId: string; threadId: string; title: string }, ended?: boolean): void;
  started(threadId: string, resource: string, position: number, holder?: ComputerHolder): void;
  ended(threadId: string, resource: string, outcome: "acquired" | "parked" | "stopped", waitedMs: number, holder?: ComputerHolder): void;
  park(owner: TurnOwner, resource: string): void;
}

export async function waitForComputer(owner: TurnOwner, resource: string, queue: ComputerQueue, hooks: ComputerWaitHooks): Promise<void> {
  const deadline = Date.now() + COMPUTER_WAIT_MAX_MS;
  let since: number | undefined;
  let outcome: "acquired" | "parked" | "stopped" = "stopped";
  let holder: ComputerHolder | undefined;
  let threadRef: { botId: string; threadId: string; title: string } | undefined;
  try {
    for (;;) {
      if (!hooks.active(owner)) throw hooks.cancelled();
      if (queue.claim()) { outcome = "acquired"; return; }
      if (since === undefined) {
        const position = queue.position();
        ({ holder, threadRef } = queue.holder?.() ?? {});
        hooks.row(owner.threadId, {
          ...noticeTool("chat.notice.waitingForScreen", position > 0 ? { position } : undefined, {}),
          name: computerWaitingText(holder, { position, estimateMs: queue.estimateMs() ?? undefined }),
        }, threadRef);
        since = Date.now();
        hooks.started(owner.threadId, resource, position, holder);
      }
      if (Date.now() >= deadline) {
        outcome = "parked";
        owner.computerParkedOn = resource;
        hooks.park(owner, resource);
        throw new ComputerWaitParked(computerParkedText(holder, COMPUTER_WAIT_MAX_MS), resource, owner.generation);
      }
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    }
  } finally {
    if (since !== undefined) {
      const waitedMs = Date.now() - since;
      if (outcome === "acquired") queue.acquired?.(waitedMs);
      const text = outcome === "acquired" ? computerFreeAfterText(holder, waitedMs)
        : outcome === "parked" ? computerParkedText(holder, COMPUTER_WAIT_MAX_MS) : computerStoppedWaitingText(holder, waitedMs);
      hooks.row(owner.threadId, text, threadRef, true);
      hooks.ended(owner.threadId, resource, outcome, waitedMs, holder);
    }
    queue.finish();
  }
}
