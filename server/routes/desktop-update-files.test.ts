import { memoryHttp } from "../testing/memory-http.ts";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { desktopUpdateFiles } from "./desktop-update-files.ts";

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
async function fixture(enabled = true) {
  const dir = mkdtempSync(join(tmpdir(), "cry-updates-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, "updates")); mkdirSync(join(dir, "updates", "nested"));
  writeFileSync(join(dir, "secret"), "secret");
  symlinkSync(join(dir, "secret"), join(dir, "updates", "escape"));
  symlinkSync(dir, join(dir, "updates", "outside"));
  for (const ext of ["yml", "zip", "dmg", "exe", "blockmap", "apk"]) writeFileSync(join(dir, "updates", `latest.${ext}`), "0123456789");
  return (path: string, method = "GET", headers: Record<string, string> = {}) => memoryHttp(async (req, res) => {
    if (!(await desktopUpdateFiles(req, res, enabled ? join(dir, "updates") : undefined))) res.writeHead(403).end();
  }, path, method, headers);
}
it("serves ordinary files anonymously with download types and cache policies", async () => {
  const get = await fixture();
  for (const [ext, type] of Object.entries({ yml: "text/yaml", zip: "application/zip", dmg: "application/x-apple-diskimage", exe: "application/vnd.microsoft.portable-executable", blockmap: "application/octet-stream", apk: "application/vnd.android.package-archive" })) {
    const response = await get(`/desktop-updates/latest.${ext}`, "GET", { "x-forwarded-proto": "https" });
    expect(response.status).toBe(200); expect(response.body).toBe("0123456789");
    expect(response.headers["content-type"]).toBe(type);
    expect(response.headers["cache-control"]).toBe(ext === "yml" ? "no-store" : "public, max-age=3600");
  }
});
it("rejects directories, traversal, symlink escapes, missing and unconfigured files", async () => {
  const get = await fixture();
  for (const path of ["/desktop-updates", "/desktop-updates/", "/desktop-updates/nested", "/desktop-updates/../secret", "/desktop-updates/..%2fsecret", "/desktop-updates/%2e%2e/secret", "/desktop-updates/%252e%252e%252fsecret", "/desktop-updates/..%5csecret", "/desktop-updates/%00", "/desktop-updates/%ZZ", "/desktop-updates/escape", "/desktop-updates/outside/secret", "/desktop-updates/missing"]) expect((await get(path)).status, path).toBe(404);
  expect((await (await fixture(false))("/desktop-updates/latest.yml")).status).toBe(404);
  expect((await get("/api/health")).status).toBe(403);
  expect((await get("/desktop-updates/latest.yml", "POST")).status).toBe(405);
});
it("supports HEAD, bounded/open/suffix ranges, and unsatisfiable ranges", async () => {
  const get = await fixture();
  const head = await get("/desktop-updates/latest.zip", "HEAD");
  expect(head.status).toBe(200); expect(head.body).toBe(""); expect(head.headers["content-length"]).toBe(10);
  for (const [range, body, contentRange] of [["bytes=2-5", "2345", "bytes 2-5/10"], ["bytes=8-", "89", "bytes 8-9/10"], ["bytes=-3", "789", "bytes 7-9/10"], ["bytes=8-99", "89", "bytes 8-9/10"]]) {
    const response = await get("/desktop-updates/latest.zip", "GET", { range });
    expect(response.status).toBe(206); expect(response.body).toBe(body); expect(response.headers["content-range"]).toBe(contentRange);
  }
  for (const range of ["bytes=99-", "bytes=5-2", "bytes=-0"]) expect((await get("/desktop-updates/latest.zip", "GET", { range })).status).toBe(416);
  expect((await get("/desktop-updates/latest.zip", "GET", { range: "bytes=0-1,4-5" })).status).toBe(200);
});
