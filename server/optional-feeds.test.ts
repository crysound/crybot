import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { AnnouncementStore } from "./announcements/feed.ts";
import { ModelManifestStore } from "./model-manifest/manifest.ts";
import { createUpdateChecker } from "./update-check.ts";

it("does not fetch optional feeds when their URLs are unset, including forced refreshes", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "cry-feeds-"));
  const request = vi.fn<typeof fetch>(() => { throw new Error("unexpected network request"); });
  vi.stubEnv("CRYBOT_UPDATE_URL", "");
  try {
    const announcements = new AnnouncementStore({ dataDir, env: {}, fetch: request });
    await announcements.refresh({ force: true });
    expect(await announcements.cardsForPage()).toEqual([]);
    const manifest = new ModelManifestStore({ dataDir, env: {}, fetch: request });
    await manifest.refresh({ force: true });
    expect(manifest.current().version).toBe(1);
    expect(await createUpdateChecker({ current: "0.1.155", install: "git", fetch: request })()).toMatchObject({ available: false });
    expect(request).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllEnvs();
    rmSync(dataDir, { recursive: true, force: true });
  }
});
