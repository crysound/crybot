import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile, symlink, truncate, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeInstaboxTools } from "../testing/fake-instabox-tools.ts";
import { CLOUD_COMPUTER_TOOLS, quote, type CloudComputerResult } from "../cloud-computer-tools.ts";
import { runInstaboxComputerTool } from "./computer-tools.ts";

const execute = promisify(execFile);
const machineId = "fixture-machine";
const signal = () => new AbortController().signal;
const json = (result: CloudComputerResult) => JSON.parse((result.content[0] as { text: string }).text);
let root: string;
let folder: string;
let bin: string;
let remoteRoot: string;
let fixture: Awaited<ReturnType<typeof fakeInstaboxTools>>;
const jpeg = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==", "base64");

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

async function binary(name: string, script: string) {
  await writeFile(join(bin, name), `#!/bin/bash\n${script}\n`, { mode: 0o755 });
}
const call = (name: string, args: Record<string, unknown> = {}, id = machineId) => runInstaboxComputerTool(fixture.machines, id, name, args, signal(), folder);
const inputCalls = async () => (await readFile(join(root, "input"))).toString().split("\0").slice(0, -1);

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "instabox-tools-fixture-"));
  remoteRoot = await mkdtemp(join(tmpdir(), "instabox-tools-remote-"));
  folder = join(root, "working"); bin = join(root, "bin");
  await mkdir(folder); await mkdir(bin);
  await writeFile(join(root, "image.jpg"), jpeg);
  await binary("xdotool", `printf '%s\\0' "$DISPLAY" "$@" >> ${quote(join(root, "input"))}; printf '1280 800'`);
  await binary("xclip", `cat > ${quote(join(root, "clipboard"))}`);
  await binary("xdg-open", `printf '%s' "$1" > ${quote(join(root, "url"))}`);
  await binary("scrot", `cp ${quote(join(root, "image.jpg"))} "\${@: -1}"`);
  fixture = await fakeInstaboxTools({
    exec: async req => {
      const cmd = req.cmd!.replace('PATH="/usr/local', `PATH="${bin}:/usr/local`).replaceAll("/tmp/cry-instabox-background", join(root, "background"));
      try {
        const output = await execute("/bin/bash", ["-c", cmd], { env: { ...process.env, ...req.envs, INSTABOX_API_KEY: "synthetic-must-not-reach-command" }, timeout: 5000 });
        return { ...output, exitCode: 0, timedOut: false, truncated: false };
      } catch (error) {
        const failed = error as { stdout: string; stderr: string; code: number; killed?: boolean };
        return { stdout: failed.stdout, stderr: failed.stderr, exitCode: typeof failed.code === "number" ? failed.code : null, timedOut: failed.killed === true, truncated: false };
      }
    },
    read: async path => ({ stream: createReadStream(path), size: (await stat(path)).size }),
    write: async (path, bytes) => { await writeFile(path, bytes); },
  });
});
afterEach(async () => {
  vi.restoreAllMocks();
  await fixture?.close();
  await rm(root, { recursive: true, force: true });
  await rm(remoteRoot, { recursive: true, force: true });
});

describe("InstaBox tools through an isolated HTTP machine fixture", () => {
  it.each([
    ["get_screen_size", {}, ["getdisplaygeometry"]],
    ["click", { x: 3, y: 4, button: "right", count: 2 }, ["mousemove", "--sync", "3", "4", "click", "--repeat", "2", "--delay", "100", "3"]],
    ["move", { x: 7, y: 8 }, ["mousemove", "--sync", "7", "8"]],
    ["drag", { x: 1, y: 2, to_x: 3, to_y: 4 }, ["mousemove", "--sync", "1", "2", "mousedown", "1", "mousemove", "--sync", "3", "4", "mouseup", "1"]],
    ["key_press", { key: "ctrl+l" }, ["key", "--clearmodifiers", "ctrl+l"]],
    ["scroll", { x: 4, y: 3, direction: "left", amount: 2 }, ["mousemove", "--sync", "4", "3", "click", "--repeat", "2", "--delay", "80", "6"]],
  ] as const)("executes %s with the exact X11 arguments and DISPLAY", async (name, args, expected) => {
    expect((await call(name, args)).isError).not.toBe(true);
    expect(await inputCalls()).toEqual([":1", ...expected]);
    expect(fixture.requests[0].exec).toMatchObject({ envs: { DISPLAY: ":1" } });
  });

  it.each([true, false])("types Unicode, quotes, newlines and shell syntax literally (clipboard %s)", async clipboard => {
    if (!clipboard) await rm(join(bin, "xclip"));
    const value = `中文 ' "\n$(touch ${join(root, "injected")})\n--hello\n`;
    expect((await call("type_text", { text: value })).isError).not.toBe(true);
    if (clipboard) {
      expect(await readFile(join(root, "clipboard"), "utf8")).toBe(value);
      expect(await inputCalls()).toEqual([":1", "key", "--clearmodifiers", "ctrl+v"]);
    } else expect(await inputCalls()).toEqual([":1", "type", "--clearmodifiers", "--", value]);
    await expect(readFile(join(root, "injected"))).rejects.toThrow();
  });

  it("opens a quoted URL literally and returns the shared launch notice", async () => {
    const url = "https://example.com/?a='&b=$(printf unsafe)";
    expect((await call("open_url", { url })).content).toEqual([{ type: "text", text: "Browser launch requested. Page loading is not confirmed; inspect the screen before continuing." }]);
    await expect.poll(() => readFile(join(root, "url"), "utf8")).toBe(url);
  });

  it("reads a native JPEG image and cleans its unique remote file", async () => {
    expect(await call("screenshot")).toEqual({ content: [{ type: "image", mimeType: "image/jpeg", data: jpeg.toString("base64") }] });
    const file = fixture.requests.find(req => req.method === "GET")!;
    expect(file.path).toMatch(/^\/tmp\/cry-instabox-.*\.jpg$/);
    await expect(readFile(file.path)).rejects.toThrow();
    expect(fixture.requests[0].exec?.cmd).not.toMatch(/resize|scale/);
  });

  it("runs foreground commands with DISPLAY but without inherited credentials", async () => {
    const result = json(await call("exec", { command: 'printf "%s|%s" "$DISPLAY" "${INSTABOX_API_KEY-unset}"; printf error >&2; exit 7' }));
    expect(result).toMatchObject({ ok: false, exitCode: 7, stdout: ":1|unset", stderr: "error" });
  });

  it("starts a detached job, polls it through completion and tails both logs", async () => {
    const started = json(await call("exec", { command: 'sleep 0.5; printf "%s" "$DISPLAY"; printf error >&2; exit 7', background: true }));
    expect(started).toMatchObject({ processId: expect.stringMatching(/^bg-\d+-[a-f0-9]{8}$/), status: "running" });
    expect(json(await call("exec_status", { process_id: started.processId }))).toMatchObject({ status: "running", exitCode: null });
    expect(json(await call("exec_status", { process_id: started.processId, wait_seconds: 3 }))).toMatchObject({ status: "finished", exitCode: 7, stdout: ":1", stderr: "error" });
    const count = fixture.requests.length;
    expect((await call("exec_status", { process_id: started.processId }, "different-machine")).isError).toBe(true);
    expect(fixture.requests).toHaveLength(count);
    expect(fixture.requests.filter(req => req.exec).every(req => req.exec!.envs?.DISPLAY === ":1")).toBe(true);
    expect(fixture.requests[0].exec?.cmd).toContain("nohup setsid");
  });

  it("cuts long Unicode log tails and recognizes a lost or unknown process", async () => {
    const started = json(await call("exec", { command: "printf '你好%.0s' {1..5000}; printf '坏%.0s' {1..4000} >&2", background: true }));
    const done = json(await call("exec_status", { process_id: started.processId, wait_seconds: 3 }));
    expect(done).toMatchObject({ status: "finished", exitCode: 0, outputCut: expect.any(String) });
    expect(done.stdout).toHaveLength(4000); expect(done.stderr).toHaveLength(2000);
    const job = join(root, "background", started.processId.split("-")[1]);
    await rm(join(job, "exit"));
    expect(json(await call("exec_status", { process_id: started.processId })).status).toBe("lost");
    await rm(job);
    expect((await call("exec_status", { process_id: started.processId })).isError).toBe(true);
  });

  it("copies bytes in both directions with quoted paths and DISPLAY on every preflight", async () => {
    const remote = join(remoteRoot, "中文 ' file\n.txt");
    await writeFile(remote, Buffer.from([0, 1, 255, 10]));
    expect(json(await call("copy_from_computer", { path: remote, to: "out/中文.txt" }))).toEqual({ path: "out/中文.txt", bytes: 4 });
    expect(await readFile(join(folder, "out/中文.txt"))).toEqual(await readFile(remote));
    expect(json(await call("copy_to_computer", { from: "out/中文.txt", path: remote + " copy" }))).toEqual({ path: remote + " copy", bytes: 4 });
    expect(await readFile(remote + " copy")).toEqual(await readFile(remote));
    expect(fixture.requests.find(req => req.method === "PUT")).toMatchObject({ mode: "0644", machineId });
    expect(fixture.requests.filter(req => req.exec).every(req => req.exec!.envs?.DISPLAY === ":1")).toBe(true);
  });

  it("rejects traversal, absolute local paths, secret folders, symlink escapes and remote escapes", async () => {
    await symlink(root, join(folder, "escape"));
    for (const path of ["../outside", root + "/outside", "escape/outside", ".crybot-secrets/key"]) {
      expect((await call("copy_from_computer", { path: "/tmp/source", to: path })).isError, path).toBe(true);
      expect((await call("copy_to_computer", { from: path, path: "/tmp/target" })).isError, path).toBe(true);
    }
    expect(fixture.requests).toHaveLength(0);
    await writeFile(join(folder, "file"), "data");
    await symlink("/etc", join(root, "remote-escape"));
    for (const remote of ["/etc/passwd", "/tmp/../etc/passwd", join(root, "remote-escape", "passwd")]) {
      const refused = await call("copy_from_computer", { path: remote });
      expect(refused.isError).toBe(true);
      expect((refused.content[0] as { text: string }).text).toContain("under /home/user or /tmp");
      expect((await call("copy_to_computer", { from: "file", path: remote })).isError).toBe(true);
    }
    expect(fixture.requests.every(req => req.exec)).toBe(true);
  });

  it("rejects oversized files before file transfer", async () => {
    const remote = join(remoteRoot, "large");
    await writeFile(remote, ""); await truncate(remote, 2 * 1024 ** 3 + 1);
    const remoteRefusal = await call("copy_from_computer", { path: remote });
    expect(remoteRefusal.isError).toBe(true);
    expect((remoteRefusal.content[0] as { text: string }).text).toContain("256 MiB");
    await writeFile(join(folder, "large"), ""); await truncate(join(folder, "large"), 2 * 1024 ** 3 + 1);
    expect((await call("copy_to_computer", { from: "large", path: remote })).isError).toBe(true);
    expect(fixture.requests.every(req => req.exec)).toBe(true);
  });

  it("rejects a download replaced with a huge file after stat without landing it", async () => {
    const remote = join(remoteRoot, "growing");
    await writeFile(remote, "small");
    const read = fixture.machines.readFile;
    const spy = vi.spyOn(fixture.machines, "readFile").mockImplementation(async (id, path, options) => {
      await truncate(path, 2 * 1024 ** 3);
      return read(id, path, options);
    });
    await expect(call("copy_from_computer", { path: remote })).rejects.toThrow("maxBytes");
    expect(spy).toHaveBeenCalledWith(machineId, remote, { maxBytes: 256 * 1024 ** 2 });
    await expect(readFile(join(folder, "growing"))).rejects.toThrow();
    await truncate(remote, 5);
    spy.mockRestore();
    expect(json(await call("copy_from_computer", { path: remote })).bytes).toBe(5);
  });

  it("bounds screenshot reads and cleans the file after rejecting an oversized image", async () => {
    await truncate(join(root, "image.jpg"), 16 * 1024 ** 2 + 1);
    const spy = vi.spyOn(fixture.machines, "readFile");
    await expect(call("screenshot")).rejects.toThrow("maxBytes");
    expect(spy).toHaveBeenCalledWith(machineId, expect.any(String), { maxBytes: 16 * 1024 ** 2 });
    const file = fixture.requests.find(req => req.method === "GET")!;
    await expect(readFile(file.path)).rejects.toThrow();
  });

  it("keeps the screenshot size check when a machines implementation ignores maxBytes", async () => {
    vi.spyOn(fixture.machines, "readFile").mockResolvedValue(new Uint8Array(16 * 1024 ** 2 + 1));
    expect((await call("screenshot")).isError).toBe(true);
    const cleanup = fixture.requests.at(-1)?.exec?.cmd;
    expect(cleanup).toContain("rm -f --");
  });

  it.each([undefined, 2 * 1024 ** 3])("rejects oversized HTTP bodies with content length %s", async size => {
    let sent = 0;
    const download = await fakeInstaboxTools({ read: async () => ({ size, stream: (async function* () {
      for (let index = 0; index < 100; index++) {
        sent++;
        yield new Uint8Array(64 * 1024);
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    })() }) });
    try {
      await expect(download.machines.readFile(machineId, "/tmp/large", { maxBytes: 128 * 1024 })).rejects.toThrow("maxBytes");
      expect(sent).toBeLessThan(100);
    } finally { await download.close(); }
  });

  it("limits copies globally across machines and both directions, retaining slots until aborted transfers settle", async () => {
    const remote = join(remoteRoot, "source");
    await writeFile(remote, "data");
    await writeFile(join(folder, "source"), "data");
    const gate = deferred();
    const reading = deferred();
    const writing = deferred();
    const read = fixture.machines.readFile, write = fixture.machines.writeFile;
    vi.spyOn(fixture.machines, "readFile").mockImplementation(async (...args) => {
      reading.resolve(); await gate.promise; return read(...args);
    });
    vi.spyOn(fixture.machines, "writeFile").mockImplementation(async (...args) => {
      writing.resolve(); await gate.promise; return write(...args);
    });
    const controller = new AbortController();
    const download = runInstaboxComputerTool(fixture.machines, machineId, "copy_from_computer", { path: remote, to: "cancelled" }, controller.signal, folder);
    const upload = call("copy_to_computer", { from: "source", path: remote + "-uploaded" }, "second-machine");
    try {
      await Promise.all([reading.promise, writing.promise]);
      for (const [name, args] of [
        ["copy_from_computer", { path: remote }],
        ["copy_to_computer", { from: "source", path: remote }],
      ] as const) {
        const count = fixture.requests.length;
        expect(await call(name, args, "third-machine")).toMatchObject({ isError: true, content: [{ text: expect.stringMatching(/busy.*try again later/i) }] });
        expect(fixture.requests).toHaveLength(count);
      }
      const aborted = expect(download).rejects.toThrow("cancel copy");
      controller.abort(new Error("cancel copy"));
      await aborted;
      expect((await call("copy_from_computer", { path: remote })).isError).toBe(true);
    } finally {
      gate.resolve();
      await Promise.allSettled([download, upload]);
    }
    await expect.poll(async () => (await call("copy_from_computer", { path: remote })).isError).not.toBe(true);
    await expect(readFile(join(folder, "cancelled"))).rejects.toThrow();
  });

  it("lets the machines layer resume and retry HTTP 409", async () => {
    fixture.state.suspended = true;
    expect((await call("get_screen_size")).isError).not.toBe(true);
    expect(fixture.state.resumes).toBe(1);
    expect(fixture.requests).toHaveLength(2);
  });

  it("polls a five-second wait at the Boat cadence and performs a final read", async () => {
    const started = json(await call("exec", { command: "sleep 8", background: true }));
    const before = fixture.requests.length;
    const result = json(await call("exec_status", { process_id: started.processId, wait_seconds: 5 }));
    const reads = fixture.requests.slice(before).filter(request => request.exec).length;
    expect(result).toMatchObject({ processId: started.processId, status: "running" });
    expect(reads).toBeGreaterThanOrEqual(3);
    expect(reads).toBeLessThanOrEqual(5);
  });

  it("keeps a background job awake with an injected lease and releases it on completion", async () => {
    const started = json(await runInstaboxComputerTool(fixture.machines, machineId, "exec", { command: "true", background: true }, signal(), folder, fixture.request));
    const path = fixture.leaseRequests[0].path;
    expect(path).toMatch(/^\/v1\/machines\/fixture-machine\/activity-leases\/crybot-[0-9a-f-]{36}$/);
    expect(fixture.leaseRequests[0]).toMatchObject({ body: { ttlSeconds: 7200 }, idempotencyKey: undefined });
    await runInstaboxComputerTool(fixture.machines, machineId, "exec_status", { process_id: started.processId, wait_seconds: 3 }, signal(), folder, fixture.request);
    expect(fixture.leaseRequests.map(request => `${request.method} ${request.path}`)).toEqual([
      `PUT ${path}`,
      `DELETE ${path}`,
    ]);
  });

  it("keeps the lease while a background job is still running", async () => {
    const started = json(await runInstaboxComputerTool(fixture.machines, machineId, "exec", { command: "sleep 0.5", background: true }, signal(), folder, fixture.request));
    const path = fixture.leaseRequests[0].path;
    const running = json(await runInstaboxComputerTool(fixture.machines, machineId, "exec_status", { process_id: started.processId }, signal(), folder, fixture.request));
    expect(running).toMatchObject({ processId: started.processId, status: "running" });
    expect(fixture.leaseRequests.map(request => `${request.method} ${request.path}`)).toEqual([
      `PUT ${path}`,
    ]);
    const finished = json(await runInstaboxComputerTool(fixture.machines, machineId, "exec_status", { process_id: started.processId, wait_seconds: 3 }, signal(), folder, fixture.request));
    expect(finished).toMatchObject({ processId: started.processId, status: "finished" });
    expect(fixture.leaseRequests.map(request => `${request.method} ${request.path}`)).toEqual([
      `PUT ${path}`,
      `DELETE ${path}`,
    ]);
  });

  it.each([false, true])("shares one lease across five background commands (concurrent %s)", async concurrent => {
    const start = () => runInstaboxComputerTool(fixture.machines, machineId, "exec", { command: "true", background: true }, signal(), folder, fixture.request);
    const started: CloudComputerResult[] = [];
    if (concurrent) started.push(...await Promise.all(Array.from({ length: 5 }, start)));
    else for (let index = 0; index < 5; index++) started.push(await start());
    const path = fixture.leaseRequests[0].path;
    expect(fixture.leaseRequests).toEqual(Array.from({ length: 5 }, () => ({ method: "PUT", path, body: { ttlSeconds: 7200 }, idempotencyKey: undefined })));
    for (const [index, result] of started.entries()) {
      expect(fixture.leaseRequests.filter(request => request.method === "DELETE")).toHaveLength(0);
      const status = json(await call("exec_status", { process_id: json(result).processId, wait_seconds: 3 }));
      expect(status.status).toBe("finished");
      expect(fixture.leaseRequests.filter(request => request.method === "DELETE")).toHaveLength(index === 4 ? 1 : 0);
    }
    expect(fixture.leaseRequests.at(-1)).toMatchObject({ method: "DELETE", path });
  });

  it("discards a rejected lease and acquires a fresh ID for the next job", async () => {
    const request = vi.fn(fixture.request).mockResolvedValueOnce(new Response(null, { status: 400 }));
    const start = () => runInstaboxComputerTool(fixture.machines, machineId, "exec", { command: "true", background: true }, signal(), folder, request);
    const first = json(await start());
    await call("exec_status", { process_id: first.processId, wait_seconds: 3 });
    expect(request).toHaveBeenCalledTimes(1);
    const second = json(await start());
    await call("exec_status", { process_id: second.processId, wait_seconds: 3 });
    expect(request.mock.calls.map(([method]) => method)).toEqual(["PUT", "PUT", "DELETE"]);
    expect(request.mock.calls[1][1]).not.toBe(request.mock.calls[0][1]);
    expect(request.mock.calls[2][1]).toBe(request.mock.calls[1][1]);
  });

  it("covers every advertised tool", () => {
    expect(CLOUD_COMPUTER_TOOLS.map(tool => tool.name)).toEqual(["screenshot", "get_screen_size", "click", "move", "drag", "type_text", "key_press", "scroll", "open_url", "exec", "exec_status", "copy_from_computer", "copy_to_computer"]);
  });
});
