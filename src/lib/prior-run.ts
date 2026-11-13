// Read before main.tsx's first-paint writes: applySkin stamps cry-skin on every boot.
const PRIOR_RUN_KEYS = ["cry-skin", "cry-installed", "cry-email-gate", "cry-drafts", "cry-show-threads"];

export function hasPriorRun(store: Pick<Storage, "getItem"> | undefined): boolean {
  try {
    return PRIOR_RUN_KEYS.some((key) => store?.getItem(key) != null);
  } catch {
    return false;
  }
}
