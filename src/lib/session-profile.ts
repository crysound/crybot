import { useSyncExternalStore } from "react";
import { readSessionState } from "./session";

let displayName: string | undefined;
let reading: Promise<void> | undefined;
const listeners = new Set<() => void>();
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  reading ??= readSessionState().then((session) => {
    displayName = session.kind === "session" ? session.displayName?.trim() || undefined : undefined;
    for (const notify of listeners) notify();
  });
  return () => listeners.delete(listener);
}

export function useSessionDisplayName(): string | undefined {
  return useSyncExternalStore(subscribe, () => displayName, () => undefined);
}
