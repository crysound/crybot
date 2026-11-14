import { transientClaimFailure, type AutoVmClaimSlot } from "./auto-vm-claims.ts";
import { serverLine } from "./server-lines.ts";

export class LocalVmWakeError extends Error {}

export async function localVmWakeStep<T>(work: () => Promise<T>): Promise<T> {
  try { return await work(); }
  catch (error) { throw new LocalVmWakeError(error instanceof Error ? error.message : String(error), { cause: error }); }
}

const failures = new Map<string, { reason: string; until: number }>();
export function clearLocalVmWakeFailure(target?: string): void {
  if (target === undefined) failures.clear();
  else failures.delete(target);
}

export function recentLocalVmWakeFailure(target: string): string | undefined {
  const failure = failures.get(target);
  if (failure && failure.until > Date.now()) return failure.reason;
  failures.delete(target);
  return undefined;
}

export function localVmWakeFailureNotice(reason: string, late = false, language?: string) {
  return {
    name: `notice: ${serverLine(language, late ? "server.computer.previousWakeFailed" : "server.computer.wakeFailed", { reason })}`,
    nameCode: late ? "chat.notice.previousComputerWakeFailed" : "chat.notice.computerWakeFailed",
    nameParams: { reason }, ok: false,
  };
}

export function localVmResumeNotices(deps: {
  target: string;
  language?: () => string | undefined;
  slot(): AutoVmClaimSlot | undefined;
  live(): boolean;
  cancelled(error: unknown): boolean;
  append(tool: { name: string; nameCode: string; nameParams?: { reason: string }; ok: boolean }, late: boolean): void;
  reject(failure: string, error?: unknown): void;
}): Pick<AutoVmClaimSlot, "onWaiting" | "onRejected"> {
  return {
    onWaiting: () => deps.append({ name: `notice: ${serverLine(deps.language?.(), "server.computer.waking")}`, nameCode: "chat.notice.wakingComputer", ok: true }, false),
    onRejected: (reason, error) => {
      if (deps.cancelled(error)) return;
      for (const [target, failure] of failures) if (failure.until <= Date.now()) failures.delete(target);
      if (error instanceof LocalVmWakeError && !transientClaimFailure(error)) failures.set(deps.target, { reason, until: Date.now() + 60_000 });
      const live = deps.live();
      if (live && (deps.slot()?.waitingCalls ?? 0) > 0) deps.reject(reason, error);
      else deps.append(localVmWakeFailureNotice(reason, !live, deps.language?.()), !live);
    },
  };
}
