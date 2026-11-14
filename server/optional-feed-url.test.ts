import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { optionalFeedUrl } from "./optional-feed-url.ts";
import { createUpdateChecker } from "./update-check.ts";
import { AnnouncementStore } from "./announcements/feed.ts";
import { ModelManifestStore } from "./model-manifest/manifest.ts";

const unsafe = ["", "not a url", "ftp://feed.example.test/feed", "file:///etc/passwd", "http://feed.example.test/feed", "https://user:pass@feed.example.test/feed", "http://localhost.example.test/feed"];
describe("optional feed URLs", () => {
  it.each(unsafe)("disables invalid configuration %s before fetching", async value => {
    const dir = mkdtempSync(join(tmpdir(), "cry-feed-url-"));
    try {
      const request = vi.fn();
      expect(optionalFeedUrl({ FEED: value }, "FEED")).toBeNull();
      await createUpdateChecker({ current: "1.0.0", install: "git", url: value, fetch: request })();
      await new AnnouncementStore({ dataDir: dir, env: { CRYBOT_ANNOUNCEMENTS_URL: value }, fetch: request }).refresh();
      await new ModelManifestStore({ dataDir: dir, env: { CRYBOT_MODEL_MANIFEST_URL: value }, fetch: request }).refresh();
      expect(request).not.toHaveBeenCalled();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it.each(["https://feed.example.test/feed", "http://localhost:123/feed", "http://127.0.0.1/feed", "http://[::1]/feed"])("accepts %s", value => {
    expect(optionalFeedUrl({ FEED: value }, "FEED")?.href).toBe(value);
  });
  it.each(["javascript:alert(1)", "http://updates.example.test/release", "https://other.example.test/release", "https://user@updates.example.test/release", "https://updates.example.test:9443/release"])("discards an unsafe release URL %s", async releaseUrl => {
    const request = vi.fn(async () => Response.json({ version: "1.0.1", releaseUrl }));
    const result = await createUpdateChecker({ current: "1.0.0", install: "git", url: "https://updates.example.test/feed", fetch: request })();
    expect(result.available).toBe(true);
    expect(result.releaseUrl).toBeUndefined();
    expect(request).toHaveBeenCalledWith("https://updates.example.test/feed", expect.objectContaining({ redirect: "error" }));
  });
});
