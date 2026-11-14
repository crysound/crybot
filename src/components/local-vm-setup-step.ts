import type { LocaleKey } from "@/locales";

export interface LocalVmSetupStep4TitleInput {
  mode: "shared" | "per-bot" | "pool";
  container: "running" | "stopped" | "missing";
  resumable?: boolean;
  needsRecreate: boolean;
}

export function localVmSetupStep4Title({
  mode,
  container,
  resumable,
  needsRecreate,
}: LocalVmSetupStep4TitleInput): LocaleKey {
  if (mode === "per-bot") return "vm.setup.step4PerBot";
  if (needsRecreate) return "vm.setup.step4Recreate";
  if (container === "stopped" && resumable) return "vm.setup.step4Wake";
  return "vm.setup.step4";
}
