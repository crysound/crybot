import type { CloudColor } from "../../electron/cloud-types.mjs";
import type { LocaleKey } from "@/locales";

/** A Cloud's colour names, as main saves them (environments.cjs ENTRY_COLORS); each skin tunes its own tone of each. */
export const CLOUD_COLORS = ["blue", "teal", "purple", "orange", "red", "yellow"] as const satisfies readonly CloudColor[];
export const CLOUD_COLOR_LABEL = {
  blue: "cloudPlan.color.blue", teal: "cloudPlan.color.teal", purple: "cloudPlan.color.purple",
  orange: "cloudPlan.color.orange", red: "cloudPlan.color.red", yellow: "cloudPlan.color.yellow",
} as const satisfies Record<CloudColor, LocaleKey>;

export function cloudColor(value: unknown): CloudColor | null {
  return CLOUD_COLORS.includes(value as CloudColor) ? value as CloudColor : null;
}

/** The skin's tone for a saved colour; the fallback for none is the app's quiet control tone. */
export function cloudColorFill(value: unknown): string {
  const color = cloudColor(value);
  return color ? `var(--identity-${color})` : "var(--color-control)";
}
