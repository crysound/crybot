import { useEffect, useState } from "react";
import type { CloudAccountState } from "../../electron/cloud-account-types.mjs";
import { cloudPlanView, type CloudPlanView } from "@/lib/cloud-status";

export function useCloudPlan(): { view: CloudPlanView; account: CloudAccountState | null } | null {
  const bridge = window.cry?.remoteClient?.active ? undefined : window.cry?.cloudAccount;
  const [account, setAccount] = useState<CloudAccountState | null>(null);
  useEffect(() => {
    if (!bridge) return;
    let active = true, updated = false;
    const unsubscribe = bridge.onState(next => { updated = true; if (active) setAccount(next); });
    void bridge.state().then(next => { if (active && !updated) setAccount(next); }).catch(() => {});
    return () => { active = false; unsubscribe(); };
  }, [bridge]);
  return bridge ? { view: cloudPlanView(account), account } : null;
}
