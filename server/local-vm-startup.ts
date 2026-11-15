export async function recoverLocalVmStartup(deps: {
  screens(): Promise<void>;
  inventory(): Promise<void>;
  sweep(): Promise<void>;
  log(line: string): void;
}): Promise<void> {
  for (const step of ["screens", "inventory"] as const) {
    try { await deps[step](); }
    catch { deps.log(`Local VM startup ${step} failed`); }
  }
  deps.log("Local VM startup recovery complete");
  void Promise.resolve().then(() => deps.sweep()).catch(() => deps.log("Local VM startup sweep failed"));
}
