// The names the desktop proxy (`/api/desktop-viewer/<target>`) serves: one rule for the server and the renderer.

/** A Local VM is `local/shared`, one of its screen targets, `local/bot-<sha256>` or `local/pool-<seat>`; a bot's VPS is `vps/<botId>`. */
export const DESKTOP_VIEWER_TARGET = /^(local\/(?:shared(?:-s[1-4])?|bot-[a-f0-9]{64}|pool-\d+)|vps\/[\w-]+)$/;

/** A Local VM's proxy name, from its target key (`shared`, `shared:sN`, `bot:<sha256>` or `pool:<seat>`). */
export const viewerTargetId = (target: { key: string }) => `local/${target.key.replace(":", "-")}`;

/** Returns the screen number encoded in a shared Local VM viewer target. */
export function screenOfViewerTarget(id: string): number | null {
  const match = /^local\/shared-s([1-4])$/.exec(id);
  return match ? Number(match[1]) : null;
}
