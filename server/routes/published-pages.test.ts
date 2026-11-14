import type { ScreenFileAccess } from "../screen-files.ts";
import { screenFilesFixture } from "../testing/screen-files-fixture.ts";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { PagePublisher } from "../pages/publisher.ts";
import { createPagesInternalRoutes, createPublishedPageRoutes, type PagesInternalContext } from "./published-pages.ts";
import { PASS, type RouteContext } from "./table.ts";

function fakePublisher() {
  return {
    publish: vi.fn(async () => ({ status: 200, text: "Published “Bake sale” at https://server.example.test/" })),
    unpublish: vi.fn(async () => ({ status: 200, text: "Unpublished.", card: { state: "unpublished" as const, title: "Bake sale" } })),
    publishFiles: vi.fn(async () => ({ status: 200, text: "Published." })),
    refreshLive: vi.fn(async () => 0),
  } satisfies PagePublisher;
}

function sink() {
  const sent: { status?: number; body?: any } = {};
  const json = ((_res: unknown, status: number, body: unknown) => { sent.status = status; sent.body = body; }) as PagesInternalContext["json"];
  return { sent, json, res: {} as PagesInternalContext["res"] };
}

async function internal(handler: ReturnType<typeof createPagesInternalRoutes>, input: { path?: string; method?: string; body?: unknown; vmWorkspace?: string | null; access?: ScreenFileAccess } = {}) {
  const { sent, json, res } = sink();
  const post = vi.fn(() => "message-1");
  const out = await handler({ method: input.method ?? "POST", path: input.path ?? "/api/internal/pages/publish", res, json, botId: "bot-1", threadId: "thread-1",
    readBody: async () => input.body ?? {}, folders: async () => ({ roots: ["/work/bot-1"], vmWorkspace: input.vmWorkspace ?? null, ...(input.access ? { access: input.access } : {}) }), post,
    requireActive: () => {}, signal: new AbortController().signal });
  return { out, post, ...sent };
}

describe("the page tools' internal routes", () => {
  it("passes requests that are not its own", async () => {
    const handler = createPagesInternalRoutes(fakePublisher());
    expect((await internal(handler, { path: "/api/internal/attach-file" })).out).toBe(PASS);
    expect((await internal(handler, { method: "GET" })).out).toBe(PASS);
  });

  it("publishes as the capability's own bot and conversation, from its own folders, whatever the body says", async () => {
    const publisher = fakePublisher(), handler = createPagesInternalRoutes(publisher);
    const answer = await internal(handler, { body: { path: "site", title: "Bake sale", page_id: "abcdefghijklmnopqrstuvwxyz", botId: "someone-else" } });
    expect(answer).toMatchObject({ status: 200, body: { ok: true, text: expect.stringContaining("Published") } });
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({ botId: "bot-1", threadId: "thread-1", path: "site", title: "Bake sale",
      pageId: "abcdefghijklmnopqrstuvwxyz", roots: ["/work/bot-1"], call: expect.objectContaining({ assertActive: expect.any(Function) }) }));
  });

  it("passes live on, and only when the tool was given it", async () => {
    const publisher = fakePublisher(), handler = createPagesInternalRoutes(publisher);
    await internal(handler, { body: { path: "site", title: "Sales", live: true } });
    expect(publisher.publish).toHaveBeenLastCalledWith(expect.objectContaining({ live: true }));
    await internal(handler, { body: { path: "site", title: "Sales" } });
    expect(publisher.publish).toHaveBeenLastCalledWith(expect.not.objectContaining({ live: expect.anything() }));
    expect(await internal(handler, { body: { path: "site", title: "Sales", live: "yes" } })).toMatchObject({ status: 400 });
  });

  it("reads a path inside the bot's private desktop as the same file on this computer", async () => {
    const publisher = fakePublisher(), handler = createPagesInternalRoutes(publisher);
    await internal(handler, { body: { path: "/home/cua/workspace/site", title: "Site" }, vmWorkspace: "/vm/bot-1" });
    // The guest path becomes this computer's own path under the private desktop's folder (Windows joins with "\\").
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({ path: join("/vm/bot-1", "site"), roots: ["/vm/bot-1", "/work/bot-1"] }));
  });

  it("refuses a body that isn't the tool's, and passes on a publisher's refusal as an error", async () => {
    const publisher = fakePublisher(), handler = createPagesInternalRoutes(publisher);
    expect(await internal(handler, { body: { path: 3, title: "x" } })).toMatchObject({ status: 400 });
    expect(publisher.publish).not.toHaveBeenCalled();
    publisher.publish.mockResolvedValueOnce({ status: 403, text: "Publishing a page needs a Cry Bot account." });
    expect(await internal(handler, { body: { path: "site", title: "x" } })).toMatchObject({ status: 403, body: { error: "Publishing a page needs a Cry Bot account." } });
  });

  it("unpublishes by page id or path, as the capability's bot", async () => {
    const publisher = fakePublisher(), handler = createPagesInternalRoutes(publisher);
    const answer = await internal(handler, { path: "/api/internal/pages/unpublish", body: { path: "site" } });
    expect(answer).toMatchObject({ status: 200, body: { ok: true, text: "Unpublished." } });
    expect(publisher.unpublish).toHaveBeenCalledWith({ path: "site", botId: "bot-1", roots: ["/work/bot-1"], call: expect.anything() });
  });
});

describe("the card's Unpublish", () => {
  const call = async (handler: ReturnType<typeof createPublishedPageRoutes>, path: string, method = "POST") => {
    const sent: { status?: number; body?: any } = {};
    const out = await handler({ path, method, res: {}, json: (_res: unknown, status: number, body: unknown) => { sent.status = status; sent.body = body; } } as unknown as RouteContext);
    return { out, ...sent };
  };

  it("unpublishes the page the path names and answers with its card", async () => {
    const publisher = fakePublisher(), handler = createPublishedPageRoutes(publisher);
    expect(await call(handler, "/api/published-pages/abcdefghijklmnopqrstuvwxyz/unpublish")).toMatchObject({ status: 200, body: { ok: true, card: { state: "unpublished" } } });
    expect(publisher.unpublish).toHaveBeenCalledWith({ pageId: "abcdefghijklmnopqrstuvwxyz" });
    expect((await call(handler, "/api/published-pages/abcdefghijklmnopqrstuvwxyz/unpublish", "GET")).out).toBe(PASS);
    expect((await call(handler, "/api/published-pages/short/unpublish")).out).toBe(PASS);
  });
});

it.skipIf(process.platform === "win32")("passes screen access to both page publishing and path-based unpublishing", async () => {
  const f = await screenFilesFixture();
  try {
    const publisher = fakePublisher(), handler = createPagesInternalRoutes(publisher);
    const path = "/home/cua/workspace/screens/s2/site";
    await internal(handler, { body: { path, title: "Screen page" }, vmWorkspace: f.workspace, access: f.access });
    await internal(handler, { path: "/api/internal/pages/unpublish", body: { path }, access: f.access, vmWorkspace: f.workspace });
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({ path, access: f.access, vmWorkspace: f.workspace }));
    expect(publisher.unpublish).toHaveBeenCalledWith(expect.objectContaining({ path, access: f.access, vmWorkspace: f.workspace }));
  } finally { await f.cleanup(); }
});

it.skipIf(process.platform === "win32")("publishes screen pages, refreshes changed bytes and unpublishes the same source", async () => {
  const { createPagePublisher } = await import("../pages/publisher.ts");
  const { PublishedPagesStore } = await import("../pages/store.ts");
  const f = await screenFilesFixture();
  try {
    await f.access.writeFile("site/index.html", Buffer.from("<h1>One</h1>"));
    const pageId = "abcdefghijklmnopqrstuvwx";
    const publish = vi.fn(async () => ({ ok: true as const, pageId, url: "https://page.example.test/", usage: { pages: 1, limit: 10 }, badge: false }));
    const unpublish = vi.fn(async () => ({ ok: true as const, pageId, usage: { pages: 0, limit: 10 } }));
    const store = new PublishedPagesStore(join(f.root, "pages.json"));
    const publisher = createPagePublisher({ client: { publish, unpublish }, store, patch: () => {}, liveAccess: () => f.access });
    const input = { botId: "screen-bot", threadId: "screen-thread", path: "site", title: "Screen page", roots: [f.workspace], access: f.access, live: true, post: () => "card" };
    expect(await publisher.publish(input)).toMatchObject({ status: 200 });
    expect(store.get(pageId)?.source).toBe("/home/cua/workspace/screens/s2/site");
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.objectContaining({ data: expect.any(Buffer) })] }), undefined);
    const now = Date.now() + 120_000;
    expect(await publisher.refreshLive(now)).toBe(0);
    await f.access.writeFile("site/index.html", Buffer.from("<h1>Two</h1>"));
    expect(await publisher.refreshLive(now + 120_000)).toBe(1);
    expect(await publisher.unpublish({ botId: input.botId, path: "site", roots: [], access: f.access })).toMatchObject({ status: 200 });
    expect(unpublish).toHaveBeenCalledWith(pageId, undefined);
    expect(store.get(pageId)).toBeNull();
  } finally { await f.cleanup(); }
});

it.each([false, true])("stops a screen page after reassignment (liveAccess provided: %s)", async (withResolver) => {
  const { createPagePublisher } = await import("../pages/publisher.ts");
  const { PublishedPagesStore } = await import("../pages/store.ts");
  const f = await screenFilesFixture();
  try {
    await f.access.writeFile("site/index.html", Buffer.from("old bot"));
    const pageId = "abcdefghijklmnopqrstuvwx";
    const publish = vi.fn(async () => ({ ok: true as const, pageId, url: "https://page.example.test/", usage: { pages: 1, limit: 10 }, badge: false }));
    const store = new PublishedPagesStore(join(f.root, "pages.json"));
    let assignedBot = "old-bot";
    const publisher = createPagePublisher({ client: { publish, unpublish: vi.fn() }, store, patch: () => {},
      liveRoots: () => [f.workspace], ...(withResolver ? { liveAccess: (botId: string) => assignedBot === botId ? f.access : null } : {}) });
    expect(await publisher.publish({ botId: "old-bot", threadId: "thread", path: "site", title: "Old page", roots: [f.workspace], access: f.access, live: true, post: () => "card" })).toMatchObject({ status: 200 });
    assignedBot = "new-bot";
    await f.access.writeFile("site/index.html", Buffer.from("new bot private content"));
    const calls = (await f.calls()).length;
    expect(await publisher.refreshLive(Date.now() + 120_000)).toBe(0);
    expect(publish).toHaveBeenCalledTimes(1);
    expect((await f.calls()).length).toBe(calls);
    expect(store.get(pageId)).not.toBeNull();
    expect(store.get(pageId)?.live).not.toBe(true);
  } finally { await f.cleanup(); }
});
