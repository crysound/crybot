import type { DesktopTarget } from "../routes/desktop-viewer.ts";

export function instaboxDesktopTarget(
  key: string,
  upstream: () => Promise<{ url: string; headers: Record<string, string> }>,
  opts?: { live?: () => boolean; touch?: () => void },
): DesktopTarget {
  return {
    key,
    resolve: async () => ({ port: 0, password: null, upstream: await upstream(), live: opts?.live, touch: opts?.touch }),
  };
}
