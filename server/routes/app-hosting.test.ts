import type { ScreenFileAccess } from "../screen-files.ts";
import { screenFilesFixture } from "../testing/screen-files-fixture.ts";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import type { AppPublisher } from "../host/app-publisher.ts";
import { outsideRouteRefused } from "../host/outside-fence.ts";
import { createAppHostingInternalRoutes, type AppHostingContext } from "./app-hosting.ts";
import { PASS } from "./table.ts";

function fakePublisher() {
  return {
    publish: vi.fn(async () => ({ status: 200 as const, body: { ok: true, url: "https://mb-1.netlify.app/", live: true } })),
    status: vi.fn(async () => ({ status: 200 as const, body: { ok: true, apps: "3 of 10" } })),
    remove: vi.fn(async () => ({ status: 409 as const, body: { error: "Nothing is published from this folder on the plan's included hosting.", code: "not_found" } })),
    removeByKey: vi.fn(async () => {}),
  } satisfies AppPublisher;
}

async function call(publisher: AppPublisher, input: { path?: string; method?: string; body?: unknown; vmWorkspace?: string | null; vmGuestRoot?: string; access?: ScreenFileAccess } = {}) {
  const sent: { status?: number; body?: any } = {};
  const json = ((_res: unknown, status: number, body: unknown) => { sent.status = status; sent.body = body; }) as AppHostingContext["json"];
  const out = await createAppHostingInternalRoutes(publisher)({ method: input.method ?? "POST", path: input.path ?? "/api/internal/apps/publish", res: {} as AppHostingContext["res"], json, botId: "bot-1",
    readBody: async () => input.body ?? {}, folders: async () => ({ roots: ["/work/bot-1"], vmWorkspace: input.vmWorkspace ?? null, vmGuestRoot: input.vmGuestRoot, ...(input.access ? { access: input.access } : {}) }) });
  return { out, ...sent };
}

describe("publish_app's internal route", () => {
  it("passes requests that are not its own", async () => {
    expect((await call(fakePublisher(), { path: "/api/internal/pages/publish" })).out).toBe(PASS);
    expect((await call(fakePublisher(), { method: "GET" })).out).toBe(PASS);
  });

  it("publishes as the capability's own bot from its own folders, whatever the body says", async () => {
    const publisher = fakePublisher();
    const answer = await call(publisher, { body: { path: "shop/dist", project: "shop", title: "Shop", botId: "someone-else", roots: ["/"] } });
    expect(answer).toMatchObject({ status: 200, body: { ok: true, live: true } });
    expect(publisher.publish).toHaveBeenCalledWith({ botId: "bot-1", roots: ["/work/bot-1"], path: "shop/dist", project: "shop", title: "Shop" });
  });

  it("answers status with or without a folder, and delete only with one", async () => {
    const publisher = fakePublisher();
    expect((await call(publisher, { body: { action: "status" } })).body).toEqual({ ok: true, apps: "3 of 10" });
    expect(publisher.status).toHaveBeenLastCalledWith({ botId: "bot-1", roots: ["/work/bot-1"] });
    await call(publisher, { body: { action: "status", path: "shop" } });
    expect(publisher.status).toHaveBeenLastCalledWith({ botId: "bot-1", roots: ["/work/bot-1"], path: "shop" });
    expect(await call(publisher, { body: { action: "delete", path: "shop" } })).toMatchObject({ status: 409, body: { code: "not_found" } });
    expect(publisher.remove).toHaveBeenCalledWith({ botId: "bot-1", roots: ["/work/bot-1"], path: "shop" });
    for (const body of [{ action: "delete" }, {}, { action: "publish", path: "  " }]) {
      expect((await call(publisher, { body })).status, JSON.stringify(body)).toBe(400);
    }
    expect(publisher.remove).toHaveBeenCalledTimes(1);
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it("refuses a body that is not the tool's, before anything is read", async () => {
    const publisher = fakePublisher();
    for (const body of [{ action: "make-public", path: "shop" }, { path: 5 }, { path: "x".repeat(5000) }, { path: "shop", title: ["a"] }]) {
      expect(await call(publisher, { body }), JSON.stringify(body).slice(0, 60)).toMatchObject({ status: 400, body: { error: "publish_app takes action (publish or delete), path, project and title, all text." } });
    }
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it("reads a path in the bot's Local VM workspace as the same folder on this computer", async () => {
    const publisher = fakePublisher(), vmWorkspace = join("/data", "vm", "bot-1");
    await call(publisher, { body: { path: "/home/cua/workspace/shop", title: "Shop" }, vmWorkspace });
    expect(publisher.publish).toHaveBeenCalledWith({ botId: "bot-1", roots: [vmWorkspace, "/work/bot-1"], path: join(vmWorkspace, "shop"), title: "Shop" });
  });

  it("maps screen guest paths and projects without access for publish, status and delete", async () => {
    const publisher = fakePublisher(), vmWorkspace = join("/vm", "screens", "s2"), vmGuestRoot = "/home/crybot-s2/workspace";
    for (const action of ["publish", "status", "delete"]) {
      await call(publisher, { body: { action, path: `${vmGuestRoot}/site/dist`, project: `${vmGuestRoot}/site` }, vmWorkspace, vmGuestRoot });
    }
    for (const invoke of [publisher.publish, publisher.status, publisher.remove]) {
      expect(invoke).toHaveBeenCalledWith(expect.objectContaining({ path: join(vmWorkspace, "site/dist"), project: join(vmWorkspace, "site") }));
    }
  });

  it("is closed to a turn that came in from outside", () => {
    expect(outsideRouteRefused("POST", "/api/internal/apps/publish")).toBe(true);
  });
});

it.skipIf(process.platform === "win32")("forwards screen file access with guest paths for publish, status and delete", async () => {
  const f = await screenFilesFixture();
  try {
    const publisher = fakePublisher();
    const vmGuestRoot = "/home/crybot-s2/workspace", path = `${vmGuestRoot}/site`;
    for (const action of ["publish", "status", "delete"]) {
      await call(publisher, { body: { action, path, project: vmGuestRoot, title: "Screen page" }, vmWorkspace: f.workspace, vmGuestRoot, access: f.access });
    }
    for (const invoke of [publisher.publish, publisher.status, publisher.remove]) {
      expect(invoke).toHaveBeenCalledWith(expect.objectContaining({ path, project: vmGuestRoot, access: f.access, vmWorkspace: f.workspace }));
    }
  } finally { await f.cleanup(); }
});

it.skipIf(process.platform === "win32")("publishes screen bytes and keeps, discovers and removes its record through screen access", async () => {
  const { createAppPublisher } = await import("../host/app-publisher.ts");
  const { createIncludedHosting } = await import("../host/included-hosting.ts");
  const f = await screenFilesFixture();
  try {
    await f.access.writeFile("site/index.html", Buffer.from("<h1>Private screen page</h1>"));
    await f.access.writeFile("site/.env", Buffer.from("hidden"));
    const uploaded: Buffer[] = [], keys: string[] = [];
    const app = { key: "fixture-app", title: "Screen page", state: "ready", url: "https://app.example.test/" };
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url === app.url) return new Response("<h1>Page</h1>", { headers: { "content-type": "text/html" } });
      if (init?.method === "PUT" && url.includes("/files/")) uploaded.push(Buffer.from(init.body as Uint8Array));
      if (init?.method === "PUT" && !url.includes("/files/")) {
        const manifest = JSON.parse(String(init.body));
        keys.push(url);
        return Response.json({ app, created: true, required: manifest.files.map((file: { sha1: string }) => ({ sha1: file.sha1 })), allowance: {} });
      }
      return Response.json({ app, apps: [app], allowance: {} });
    };
    const hosting = createIncludedHosting({ dataDir: f.root, credential: () => ({ api: "https://hosting.example.test", token: "fixture-only", included: true }), fetch: fetcher });
    const publisher = createAppPublisher({ hosting, botName: () => "Screen bot", botFolder: () => f.root, home: "/unused", env: {}, fetch: fetcher });
    const input = { botId: "screen-bot", roots: [f.workspace], path: "site", title: "Screen page", access: f.access };
    const beforePublish = (await f.calls()).length;
    expect(await publisher.publish(input)).toMatchObject({ status: 200, body: { live: true, files: 1 } });
    const publishCalls = (await f.calls()).length - beforePublish;
    expect(uploaded.map((buffer) => buffer.toString())).toEqual(["<h1>Private screen page</h1>"]);
    expect(JSON.parse((await f.access.readFile("site/.netlify-site.json", 16_384)).toString())).toMatchObject({ hosting: "included", title: "Screen page" });
    expect(await publisher.status({ botId: input.botId, roots: input.roots, access: f.access })).toMatchObject({ status: 200, body: { projects: [expect.objectContaining({ folder: "/home/cua/workspace/screens/s2/site" })] } });
    const { writeFile, mkdir } = await import("node:fs/promises");
    for (let n = 0; n < 25; n++) await writeFile(join(f.screenDir, "site", `${n}.css`), `body{order:${n}}`);
    const beforeLargePublish = (await f.calls()).length;
    expect(await publisher.publish(input)).toMatchObject({ status: 200 });
    expect((await f.calls()).length - beforeLargePublish).toBe(publishCalls);
    expect(publishCalls).toBe(7);
    expect(keys[0]).toBe(keys[1]);
    expect(await publisher.remove(input)).toMatchObject({ status: 200, body: { deleted: true } });
    expect(await f.access.stat("site/.netlify-site.json")).toBeNull();
    expect(await publisher.publish({ ...input, path: "../s1/site" })).toMatchObject({ status: 400 });
    const own = join(f.root, "bot");
    await mkdir(own);
    await writeFile(join(own, "index.html"), "host page");
    const hostInput = { ...input, path: own, roots: [own, f.workspace] };
    expect(await publisher.publish(hostInput)).toMatchObject({ status: 200, body: { files: 1 } });
    expect(await publisher.status(hostInput)).toMatchObject({ status: 200 });
    expect(await publisher.remove(hostInput)).toMatchObject({ status: 200 });
    expect(await publisher.publish({ ...input, path: "/home/crybot-s2/workspace/site" })).toMatchObject({ status: 200 });
    const wrapped = { ...hostInput, access: { ...f.access }, vmWorkspace: f.workspace };
    for (const path of [join(f.screenDir, "site"), f.workspace]) {
      expect(await publisher.publish({ ...wrapped, path })).toMatchObject({ status: 400 });
      expect(await publisher.status({ ...wrapped, path })).toMatchObject({ status: 400 });
      expect(await publisher.remove({ ...wrapped, path })).toMatchObject({ status: 400 });
    }
    expect(await publisher.publish(wrapped)).toMatchObject({ status: 200 });
    expect(await publisher.remove(wrapped)).toMatchObject({ status: 200 });
    for (const path of [join(f.screenDir, "site"), "/home/crybot-s1/workspace/site"]) {
      expect(await publisher.publish({ ...hostInput, path })).toMatchObject({ status: 400 });
    }
  } finally { await f.cleanup(); }
});
