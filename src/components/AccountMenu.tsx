import type { AccountsView, AccountSwitchResult, RailOpenResult } from "../../electron/cloud-account-types.mjs";
import { t } from "@/lib/i18n";
import type { SidebarMenuItem } from "./SidebarPopoverMenu";

export interface AccountsAccess {
  view: AccountsView | null;
  openSheet: (() => void) | null;
  noRail: boolean;
  signOut(id: string): void;
  add(email?: string): void;
}

export function switchNote(result: Pick<RailOpenResult | AccountSwitchResult, "outcome">): string | null {
  switch (result.outcome) {
    case "moving": return t("accounts.moving");
    case "gone": return t("accounts.gone");
    case "failed": return t("accounts.failed");
    default: return null;
  }
}

export function useAccounts(): AccountsAccess & { sheet: null; closeSheet(): void } {
  return { view: null, openSheet: null, noRail: true, signOut: () => {}, add: () => {}, sheet: null, closeSheet: () => {} };
}

export function cloudRowLabel(_view: AccountsView | null): string {
  return t("settings.section.cloudAccount");
}

export function accountMenuItems(_access: AccountsAccess): SidebarMenuItem[] {
  return [];
}

export function AccountsSheet(_props: { onClose: () => void; adding?: string | null; note?: string | null }) {
  return null;
}

export function useAccountsSheet(): { open: false; close: () => void } {
  return { open: false, close: () => {} };
}
