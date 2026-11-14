import { mkdirSync, mkdtempSync, realpathSync, renameSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { open, readdir, realpath, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { pageSignature, PageBundleError, readPageBundle } from "./bundle.ts";

// The real file system, wrapped so a test can change a folder at the moment it is listed.
vi.mock("node:fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs/promises")>();
  return { ...real, open: vi.fn(real.open), readdir: vi.fn(real.readdir), realpath: vi.fn(real.realpath), stat: vi.fn(real.stat) };
});

const folder = () => realpathSync(mkdtempSync(join(tmpdir(), "cry-page-bundle-")));

describe("readPageBundle", () => {
  it("does not follow its folder swapped for a link while it is being read", async () => {
    const base = folder();
    const page = join(base, "page"), other = join(base, "other");
    mkdirSync(page);
    mkdirSync(other);
    writeFileSync(join(page, "index.html"), "<h1>Mine</h1>");
    writeFileSync(join(other, "index.html"), "<h1>Not mine</h1>");
    const list = vi.mocked(readdir), actual = list.getMockImplementation()!;
    list.mockImplementationOnce((async (...args: Parameters<typeof actual>) => {
      renameSync(page, join(base, "moved"));
      symlinkSync(other, page);
      return actual(...args);
    }) as typeof actual);
    const read = readPageBundle(page, [page]);
    await expect(read).rejects.toBeInstanceOf(PageBundleError);
    await expect(read).rejects.toThrow(/no index\.html/);
  });

  it("does not read a file through its folder swapped for a link after the check", async () => {
    const base = folder();
    const page = join(base, "page"), other = join(base, "other");
    mkdirSync(page);
    mkdirSync(other);
    writeFileSync(join(page, "index.html"), "<h1>Mine</h1>");
    writeFileSync(join(other, "index.html"), "<h1>Not mine</h1>");
    const opener = vi.mocked(open), actual = opener.getMockImplementation()!;
    opener.mockImplementationOnce((async (...args: Parameters<typeof actual>) => {
      renameSync(page, join(base, "moved"));
      symlinkSync(other, page);
      return actual(...args);
    }) as typeof actual);
    const read = readPageBundle(page, [page]);
    await expect(read).rejects.toBeInstanceOf(PageBundleError);
    await expect(read).rejects.toThrow(/no index\.html/);
  });

  it.skipIf(process.platform !== "linux")("does not read a file through its folder swapped during the open", async () => {
    const base = folder();
    const page = join(base, "page"), other = join(base, "other"), moved = join(base, "moved");
    mkdirSync(page);
    mkdirSync(other);
    writeFileSync(join(page, "index.html"), "<h1>Mine</h1>");
    writeFileSync(join(other, "index.html"), "<h1>Not mine</h1>");
    const swap = () => { renameSync(page, moved); symlinkSync(other, page); };
    const opener = vi.mocked(open), actualOpen = opener.getMockImplementation()!;
    const resolver = vi.mocked(realpath), actualRealpath = resolver.getMockImplementation()!;
    const stater = vi.mocked(stat), actualStat = stater.getMockImplementation()!;
    opener.mockImplementationOnce((async (...args: Parameters<typeof actualOpen>) => {
      swap();
      const handle = await actualOpen(...args);
      // Fallback path only (no /proc/self/fd): put back before the path is resolved, swapped again before the compare.
      resolver.mockImplementationOnce((async (...rest: Parameters<typeof actualRealpath>) => {
        unlinkSync(page);
        renameSync(moved, page);
        return actualRealpath(...rest);
      }) as typeof actualRealpath);
      stater.mockImplementationOnce((async (...rest: Parameters<typeof actualStat>) => {
        swap();
        return actualStat(...rest);
      }) as typeof actualStat);
      return handle;
    }) as typeof actualOpen);
    try {
      const read = readPageBundle(page, [page]);
      await expect(read).rejects.toBeInstanceOf(PageBundleError);
      await expect(read).rejects.toThrow(/no index\.html/);
    } finally {
      // The /proc/self/fd path never calls these, so drop any hooks left queued for later tests.
      resolver.mockReset();
      stater.mockReset();
    }
  });

  it("with exact roots, does not follow the root itself swapped for a link", async () => {
    const base = folder();
    const page = join(base, "page"), other = join(base, "other");
    mkdirSync(other);
    writeFileSync(join(other, "index.html"), "<h1>Not mine</h1>");
    symlinkSync(other, page);
    await expect(readPageBundle(page, [page], undefined, { exactRoots: true })).rejects.toMatchObject({ status: 403 });
  });
});

describe("pageSignature", () => {
  it("counts videos only for a page that carries them", async () => {
    // As the page's own source is named: the native realpath, which on Windows expands a short (8.3) temp path.
    const page = realpathSync.native(folder());
    writeFileSync(join(page, "index.html"), "<h1>Clip</h1>");
    writeFileSync(join(page, "clip.mp4"), "a");
    const plain = await pageSignature(page), withVideos = await pageSignature(page, { videos: true });
    writeFileSync(join(page, "clip.mp4"), "ab");
    expect(await pageSignature(page)).toBe(plain);
    expect(await pageSignature(page, { videos: true })).not.toBe(withVideos);
  });
});

it.skipIf(process.platform === "win32")("bundles private screen files and excludes secret folders, hidden files and escaped links", async () => {
  const { screenFilesFixture } = await import("../testing/screen-files-fixture.ts");
  const f = await screenFilesFixture();
  try {
    await f.access.writeFile("site/index.html", Buffer.from("<h1>Screen two</h1>"));
    await f.access.writeFile("site/style.css", Buffer.from("h1{color:teal}"));
    await f.access.writeFile("site/.env", Buffer.from("hidden"));
    await f.access.writeFile("site/.crybot-secrets/value", Buffer.from("private"));
    symlinkSync(f.root, join(f.screenDir, "site", "escape"));
    const bundle = await readPageBundle("site", ["/unused/host"], undefined, {}, f.access);
    expect(bundle.source).toBe("/home/cua/workspace/screens/s2/site");
    expect(bundle.files.map((file) => file.path)).toEqual(["index.html", "style.css"]);
    expect(bundle.files[0]!.data.toString()).toBe("<h1>Screen two</h1>");
    expect(bundle.skipped).toContainEqual({ path: "escape", why: "link" });
    expect(JSON.stringify(bundle)).not.toContain(".crybot-secrets");
    await expect(readPageBundle("../s1/site", [], undefined, {}, f.access)).rejects.toMatchObject({ status: 403 });
    await expect(readPageBundle("site", [], { bytes: 3, files: 2 }, {}, f.access)).rejects.toMatchObject({ status: 413 });
  } finally { await f.cleanup(); }
});

it("bundles own host pages with screen access while excluding VM paths and other screen aliases", async () => {
  const { screenFilesFixture } = await import("../testing/screen-files-fixture.ts");
  const f = await screenFilesFixture();
  try {
    const host = join(f.root, "bot");
    mkdirSync(host);
    writeFileSync(join(host, "index.html"), "host page");
    expect((await readPageBundle(host, [host, f.workspace], undefined, {}, f.access)).files[0]?.data.toString()).toBe("host page");
    mkdirSync(join(f.workspace, "legacy"));
    writeFileSync(join(f.workspace, "legacy/index.html"), "legacy");
    symlinkSync(join(f.workspace, "legacy"), join(host, "vm-link"));
    for (const path of [join(f.workspace, "legacy"), join(host, "vm-link"), "/home/crybot-s1/workspace/site"]) {
      await expect(readPageBundle(path, [host, f.workspace], undefined, {}, f.access)).rejects.toMatchObject({ status: 403 });
    }
    await f.access.writeFile("site/index.html", Buffer.from("alias page"));
    expect((await readPageBundle("/home/crybot-s2/workspace/site", [host], undefined, {}, f.access)).files[0]?.data.toString()).toBe("alias page");
  } finally { await f.cleanup(); }
});

it("passes explicit VM exclusions through bot bundles and sources with wrapped access", async () => {
  const { screenFilesFixture } = await import("../testing/screen-files-fixture.ts");
  const { readBotPageBundle, botFileSource } = await import("./bundle.ts");
  const f = await screenFilesFixture();
  try {
    const own = join(f.root, "bot"), legacy = join(f.workspace, "legacy");
    mkdirSync(own);
    mkdirSync(legacy);
    writeFileSync(join(own, "index.html"), "own");
    writeFileSync(join(legacy, "index.html"), "legacy");
    symlinkSync(legacy, join(own, "vm-link"));
    const folders = async () => ({ roots: [own, f.workspace], vmWorkspace: f.workspace, access: { ...f.access } });
    expect((await readBotPageBundle(own, folders)).files[0]?.data.toString()).toBe("own");
    expect(await botFileSource(own, folders)).toBe(own);
    for (const path of [legacy, join(own, "vm-link")]) {
      await expect(readBotPageBundle(path, folders)).rejects.toMatchObject({ status: 403 });
      await expect(botFileSource(path, folders)).rejects.toMatchObject({ status: 403 });
    }
  } finally { await f.cleanup(); }
});
