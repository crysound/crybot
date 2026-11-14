import { createHash } from "node:crypto";
import { join } from "node:path";
import { DATA_DIR } from "./config.ts";

export const CONTAINER = "crybot-computer";
export const VM_WORKSPACE_DIR = join(DATA_DIR, "vm-home");
export const VM_WORKSPACE_GUEST = "/home/cua/workspace";
export const DISPLAY = ":1";
export const CUA_SOCKET = "/run/user/1000/crybot-cua.sock";
export const CUA_EXECUTABLE = "/usr/local/libexec/crybot/cua-driver";

const HOST_VIEWER_PORT = 6080;

export interface LocalVmTarget {
  key: string;
  containerName: string;
  workspaceDir: string;
  viewerPort: number | null;
  label: string;
  screen?: number;
}

export const SHARED_LOCAL_VM_TARGET: LocalVmTarget = {
  key: "shared",
  containerName: CONTAINER,
  workspaceDir: VM_WORKSPACE_DIR,
  viewerPort: HOST_VIEWER_PORT,
  label: "shared",
};

function checkedScreen(n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > 4) throw new RangeError("screen must be between 1 and 4");
  return n;
}

export function sharedScreenTarget(n: number): LocalVmTarget {
  checkedScreen(n);
  return { ...SHARED_LOCAL_VM_TARGET, key: `shared:s${n}`, screen: n };
}

export function containerTargetOf(target: LocalVmTarget): LocalVmTarget {
  return isScreenTarget(target) ? SHARED_LOCAL_VM_TARGET : target;
}

export function isScreenTarget(target: LocalVmTarget): target is LocalVmTarget & { screen: number } {
  return target.key === `shared:s${target.screen}` && Number.isInteger(target.screen) && (target.screen as number) >= 1 && (target.screen as number) <= 4;
}

export function screenUser(n: number): string { return `crybot-s${checkedScreen(n)}`; }
export function screenUid(n: number): number { return 61000 + checkedScreen(n); }
export function screenDisplay(n: number): string { return `:${checkedScreen(n)}`; }
export function screenSocket(n: number): string { return `/run/user/${screenUid(n)}/crybot-cua.sock`; }
export function screenWorkdir(n: number): string { return `/home/cua/workspace/screens/s${checkedScreen(n)}`; }

/** Identities come from a digest, never a bot's display name or a caller-controlled path fragment. */
export function perBotLocalVmTarget(botId: string): LocalVmTarget {
  const digest = createHash("sha256").update(botId).digest("hex");
  const short = digest.slice(0, 16);
  return {
    key: `bot:${digest}`,
    containerName: `${CONTAINER}-${short}`,
    workspaceDir: join(DATA_DIR, "vm-homes", short),
    viewerPort: null,
    label: digest,
  };
}

/** Seat identities stay disjoint from the shared singleton and per-bot digests, so the three modes never meet. */
export function poolLocalVmTarget(seat: number): LocalVmTarget {
  return {
    key: `pool:${seat}`,
    containerName: `${CONTAINER}-p${seat}`,
    workspaceDir: join(DATA_DIR, "vm-homes", `pool-${seat}`),
    viewerPort: null,
    label: `pool-${seat}`,
  };
}

