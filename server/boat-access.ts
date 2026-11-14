import type { AppConfig } from "./config.ts";
import { boatCredential, type ServiceCredential } from "./included-services.ts";
import { providerLockEnabled } from "./provider-lock.ts";

export const boatAccount = (cfg: AppConfig): ServiceCredential | null => boatCredential(cfg.box?.token);

export const boatConfigured = (cfg: AppConfig) => Boolean(boatAccount(cfg));
export const boatOffered = (cfg: AppConfig) => !providerLockEnabled() && boatConfigured(cfg);

export function assertBoatAllowed(): void {
  if (providerLockEnabled()) throw Object.assign(new Error("Cloud desktop is unavailable while CRYBOT_PROVIDER_LOCK=1"), { status: 403 });
}

/** Configured-or-not for Settings, never the token. */
export const describeBoatAccount = (cfg: AppConfig): { configured: boolean; included?: true } => {
  const account = boatAccount(cfg); return { configured: Boolean(account), ...(account?.included ? { included: true as const } : {}) }; };
