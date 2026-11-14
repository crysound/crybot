import { spawn } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { CONTAINER, CUA_EXECUTABLE, CUA_SOCKET } from "./container-computer.ts";
import { containerMcpExecArgs } from "./container-mcp.ts";
import { omittedFromErrorNote } from "./mcp-error-result.ts";

const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

// The fake Docker executable below is a POSIX shell script. The production
// bridge remains portable; only this byte-for-byte process fixture is gated.
const posixOnly = describe.skipIf(process.platform === "win32");

posixOnly("Local VM Cua MCP bridge", () => {
  it("lists lazy computer tools without starting a runtime or waiting for the desktop", async () => {
    const bin = await mkdtemp(join(tmpdir(), "crybot-container-lazy-"));
    temporary.push(bin);
    await writeFile(join(bin, "podman"), "#!/bin/sh\necho UNEXPECTED-RUNTIME-START >&2\nexit 1\n", { mode: 0o700 });
    const input = [
      { jsonrpc: "2.0", id: 1, method: "initialize" },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
    ].map(frame => JSON.stringify(frame)).join("\n") + "\n";
    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(process.execPath,
        [fileURLToPath(new URL("./container-mcp.ts", import.meta.url)), "podman", CONTAINER, CUA_SOCKET], {
          env: { ...process.env, CRYBOT_EXTRA_PATH: bin, CRYBOT_CONTAINER_LAZY: "1",
            CRYBOT_CONTROL_URL: "http://localhost:1/api/internal/computer-control", CRYBOT_CONTROL_TOKEN: "fixture-capability" },
          stdio: ["pipe", "pipe", "pipe"],
        });
      let stdout = "", stderr = "";
      child.stdout.on("data", chunk => { stdout += chunk; });
      child.stderr.on("data", chunk => { stderr += chunk; });
      child.on("error", reject);
      child.on("close", code => resolve({ code, stdout, stderr }));
      child.stdin.end(input);
    });
    expect(result.code, result.stderr).toBe(0);
    expect(result.stderr).not.toContain("UNEXPECTED-RUNTIME-START");
    const frames = result.stdout.trim().split("\n").map(line => JSON.parse(line));
    expect(frames[0].result.capabilities).toEqual({ tools: {} });
    expect(frames[1].result.tools.map((tool: { name: string }) => tool.name)).toEqual(["search_tools", "describe_tool", "call_tool"]);
  });

  it("passes MCP bytes unchanged to cua-driver mcp over the container runtime", async () => {
    const bin = await mkdtemp(join(tmpdir(), "crybot-container-mcp-"));
    temporary.push(bin);
    const fakeDocker = join(bin, "docker");
    await writeFile(
      fakeDocker,
      "#!/bin/sh\nprintf 'ARGS:%s\\n' \"$*\" >&2\ncat\n",
      { mode: 0o700 },
    );
    await chmod(fakeDocker, 0o700);

    const input = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}\n';
    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [fileURLToPath(new URL("./container-mcp.ts", import.meta.url)), "docker", CONTAINER, CUA_SOCKET],
        {
          env: { ...process.env, CRYBOT_EXTRA_PATH: bin, NODE_NO_WARNINGS: "1" },
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, stdout, stderr }));
      child.stdin.end(input);
    });

    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toBe(input);
    expect(result.stderr).toContain(
      `ARGS:exec -i -u cua -e HOME=/home/cua -e DISPLAY=:1 -e CUA_DRIVER_INSTALL_CHANNEL=python_package ` +
        `-e CUA_DRIVER_RS_TELEMETRY_ENABLED=0 ${CONTAINER} ` +
        `${CUA_EXECUTABLE} mcp --socket ${CUA_SOCKET}`,
    );
  });

  it("answers ping locally so the bundled cua-driver is not invoked", async () => {
    const bin = await mkdtemp(join(tmpdir(), "crybot-container-mcp-ping-"));
    temporary.push(bin);
    const fakeDocker = join(bin, "docker");
    await writeFile(
      fakeDocker,
      `#!/bin/sh\n` +
        `printf 'ARGS:%s\\n' "$*" >&2\n` +
        `while IFS= read -r line; do\n` +
        `  case "$line" in\n` +
        `    *'"method":"ping"'* ) printf 'PING-RECEIVED:%s\\n' "$line" >&2 ;;\n` +
        `    *'"method":"tools/list"'* ) printf '{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}\\n' ;;\n` +
        `  esac\n` +
        `done\n`,
      { mode: 0o700 },
    );
    await chmod(fakeDocker, 0o700);

    const input =
      '{"jsonrpc":"2.0","id":2,"method":"ping","params":{}}\n' +
      '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n';

    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [fileURLToPath(new URL("./container-mcp.ts", import.meta.url)), "docker", CONTAINER, CUA_SOCKET],
        {
          env: { ...process.env, CRYBOT_EXTRA_PATH: bin, NODE_NO_WARNINGS: "1" },
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, stdout, stderr }));
      child.stdin.end(input);
    });

    expect(result.code, result.stderr).toBe(0);
    const lines = result.stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
    expect(lines).toEqual([
      { jsonrpc: "2.0", id: 2, result: {} },
      { jsonrpc: "2.0", id: 1, result: { tools: [] } },
    ]);
    expect(result.stderr).not.toContain("PING-RECEIVED");
    expect(result.stderr).toContain(
      `ARGS:exec -i -u cua -e HOME=/home/cua -e DISPLAY=:1 -e CUA_DRIVER_INSTALL_CHANNEL=python_package ` +
        `-e CUA_DRIVER_RS_TELEMETRY_ENABLED=0 ${CONTAINER} ` +
        `${CUA_EXECUTABLE} mcp --socket ${CUA_SOCKET}`,
    );
  });
  it("never hands an engine an error result that carries a screenshot", async () => {
    const bin = await mkdtemp(join(tmpdir(), "crybot-container-mcp-error-"));
    temporary.push(bin);
    const fakeDocker = join(bin, "docker");
    // cua-driver 0.37.0 answers a refused action with its error text plus a screenshot; success keeps its screenshot.
    await writeFile(
      fakeDocker,
      `#!/bin/sh\n` +
        `while IFS= read -r line; do\n` +
        `  case "$line" in\n` +
        `    *'"id":1'* ) printf '%s\\n' '{"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"refused"},{"type":"image","data":"iVBORw0KGgo=","mimeType":"image/png"}],"isError":true}}' ;;\n` +
        `    *'"id":2'* ) printf '%s\\n' '{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"image","data":"iVBORw0KGgo=","mimeType":"image/png"}]}}' ;;\n` +
        `  esac\n` +
        `done\n`,
      { mode: 0o700 },
    );
    await chmod(fakeDocker, 0o700);

    const input =
      '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"click","arguments":{}}}\n' +
      '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_desktop_state","arguments":{}}}\n';
    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [fileURLToPath(new URL("./container-mcp.ts", import.meta.url)), "docker", CONTAINER, CUA_SOCKET],
        {
          env: { ...process.env, CRYBOT_EXTRA_PATH: bin, NODE_NO_WARNINGS: "1" },
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, stdout, stderr }));
      child.stdin.end(input);
    });

    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout.trim().split("\n").map((line) => JSON.parse(line))).toEqual([
      {
        jsonrpc: "2.0",
        id: 1,
        result: { content: [{ type: "text", text: "refused" }, { type: "text", text: omittedFromErrorNote(1) }], isError: true },
      },
      { jsonrpc: "2.0", id: 2, result: { content: [{ type: "image", data: "iVBORw0KGgo=", mimeType: "image/png" }] } },
    ]);
  });
});

describe("screen MCP connection validation", () => {
  it.each([
    ["/run/user/61005/crybot-cua.sock", "crybot-s5", ":5"],
    ["/tmp/crybot-cua.sock", "crybot-s2", ":2"],
    ["/run/user/61002/../61001/crybot-cua.sock", "crybot-s2", ":2"],
    ["/run/user/1000/../61001/crybot-cua.sock", "crybot-s1", ":1"],
    ["/run/user/61002/crybot-cua.sock", "crybot-s1", ":2"],
    ["/run/user/61002/crybot-cua.sock", "crybot-s2", ":1"],
    ["/run/user/1000/crybot-cua.sock", "crybot-s2", ":2"],
  ])("rejects socket/identity mismatch %s %s %s", (socket, user, display) => {
    expect(() => containerMcpExecArgs(["docker", CONTAINER, socket, user, display])).toThrow("invalid Local VM connection");
  });

  it("rejects a different container instead of silently replacing it", () => {
    expect(() => containerMcpExecArgs(["docker", "other-container", "/run/user/61002/crybot-cua.sock", "crybot-s2", ":2"])).toThrow();
  });

  it("wraps screen MCP with environment removal, limits and the chosen driver socket", () => {
    const { args } = containerMcpExecArgs(["docker", CONTAINER, "/run/user/61002/crybot-cua.sock", "crybot-s2", ":2"]);
    expect(args.slice(args.indexOf(CONTAINER))).toEqual([
      CONTAINER, "env", "-u", "VNC_PW", "prlimit", "--nproc=1500", "--",
      "/usr/local/libexec/crybot/screen-program",
      "sh", "-c", 'umask 007; exec "$@"', "crybot-screen-exec",
      CUA_EXECUTABLE, "mcp", "--socket", "/run/user/61002/crybot-cua.sock",
    ]);
    expect(args).toContain("DISPLAY=:2");
    expect(args).toContain("crybot-s2");
  });
});
