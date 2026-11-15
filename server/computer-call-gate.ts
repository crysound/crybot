import type { YourComputerCall } from "../shared/your-computer.ts";
import { lazyClaimFailedText, lazyClaimRetryText, settledWithin, startAutoVmClaim, type AutoVmClaimTable } from "./auto-vm-claims.ts";
import { CONTROL_BUSY, CONTROL_HANDED_BACK, CONTROL_WAITED, type ControlState } from "./computer-control-client.ts";

type Capability = { botId: string; threadId: string; generation: string };
export function createComputerCallGate<C extends Capability>(deps: {
  claims: AutoVmClaimTable;
  snapshot(botId: string, threadId: string): { held: boolean; heldSinceMs: number | null; helpReason: unknown | null };
  isActive(capability: C): boolean;
  claimResource(capability: C): boolean;
  waiting(threadId: string, generation: string): string | undefined;
  personAwayText(): string;
  waitMs: number;
  actWithinMs: number;
  personWaitMs: number;
}) {
  return async (internalCapability: C, signal?: AbortSignal, call?: YourComputerCall, readinessOnly = false): Promise<ControlState> => {
    const { botId, threadId, generation } = internalCapability;
    let askedAt = Date.now();
    const deadline = askedAt + deps.waitMs;
    let personHeld = false;
    for (;;) {
      if (signal?.aborted || !deps.isActive(internalCapability)) return { held: true, helpOpen: false, blockedReason: "This turn no longer has this computer, so this call was not performed." };
      const snapshot = deps.snapshot(botId, threadId);
      const helpOpen = snapshot.helpReason !== null;
      const slot = deps.claims.get(threadId);
      const lazyClaim = slot && slot.owner.generation === generation ? slot : undefined;
      let held: ControlState;
      if (!readinessOnly && snapshot.held && snapshot.heldSinceMs !== null && Date.now() - snapshot.heldSinceMs >= deps.personWaitMs) {
        return { held: true, helpOpen, blockedReason: deps.personAwayText() };
      } else if (!readinessOnly && snapshot.held) {
        personHeld = true;
        held = { held: true, helpOpen, reason: "person" };
      } else if (lazyClaim?.failed) {
        // A rejected lazy claim refuses every screen call for the rest of the generation: never forward onto a desktop this turn never claimed.
        return { held: true, helpOpen: false, blockedReason: lazyClaimFailedText(lazyClaim) };
      } else if (lazyClaim?.lazy && !lazyClaim.claimed) {
        lazyClaim.onWaiting?.(); lazyClaim.onWaiting = undefined;
        startAutoVmClaim(deps.claims, threadId, generation, call);
        if (lazyClaim.begin && Date.now() < deadline && !signal?.aborted) {
          const waitStarted = Date.now();
          let waiting = !readinessOnly;
          if (waiting) lazyClaim.waitingCalls = (lazyClaim.waitingCalls ?? 0) + 1;
          const stopWaiting = () => {
            if (waiting) lazyClaim.waitingCalls = Math.max(0, (lazyClaim.waitingCalls ?? 1) - 1);
            waiting = false;
          };
          signal?.addEventListener("abort", stopWaiting, { once: true });
          try { await settledWithin(lazyClaim.begin, deadline - Date.now(), signal); }
          finally { stopWaiting(); signal?.removeEventListener("abort", stopWaiting); }
          if (lazyClaim.localVm && lazyClaim.startsComputer && lazyClaim.claimed) askedAt += Date.now() - waitStarted;
          if (lazyClaim.failed) return { held: true, helpOpen: false, blockedReason: lazyClaimFailedText(lazyClaim) };
          if (lazyClaim.claimed) continue;
          if (lazyClaim.retryReason) return { held: true, helpOpen: false, blockedReason: lazyClaimRetryText(lazyClaim) };
        }
        held = { held: true, helpOpen: false, blockedReason: deps.waiting(threadId, generation) ?? lazyClaim.pendingReason ?? CONTROL_BUSY,
          ...(readinessOnly && lazyClaim.localVm && lazyClaim.begin && !lazyClaim.retryReason ? { readinessPending: true as const } : {}) };
      } else {
        if (!readinessOnly && !deps.claimResource(internalCapability)) {
          held = { held: true, helpOpen: false, blockedReason: CONTROL_BUSY };
        } else if (!deps.isActive(internalCapability)) {
          // A call from a turn that is over never reaches the screen.
          return { held: true, helpOpen, blockedReason: "This turn no longer has this computer, so this call was not performed." };
        } else if (personHeld) {
          return { held: true, helpOpen, blockedReason: CONTROL_HANDED_BACK };
        } else {
          return !readinessOnly && Date.now() - askedAt > deps.actWithinMs ? { held: true, helpOpen, blockedReason: CONTROL_WAITED } : { held: false, helpOpen };
        }
      }
      if (Date.now() >= deadline || signal?.aborted || !deps.isActive(internalCapability)) return held;
      await settledWithin(null, Math.min(250, deadline - Date.now()), signal);
    }
  };
}
