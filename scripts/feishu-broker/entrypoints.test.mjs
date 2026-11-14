import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm, open, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

async function run(args) {
  const directory = await mkdtemp(join(tmpdir(), "feishu-entry-output-"));
  const stdout = await open(join(directory, "stdout"), "w");
  const stderr = await open(join(directory, "stderr"), "w");
  try {
    const status = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, { stdio: ["ignore", stdout.fd, stderr.fd] });
      child.on("error", reject);
      child.on("close", resolve);
    });
    return { status, stdout: await readFile(join(directory, "stdout"), "utf8"), stderr: await readFile(join(directory, "stderr"), "utf8") };
  } finally {
    await stdout.close();
    await stderr.close();
    await rm(directory, { recursive: true, force: true });
  }
}

it.each(["20.19.0", "22.22.0"])("rejects Node %s before loading either TypeScript entry", async version => {
  for (const entry of ["../lark-cli.mjs", "./main.mjs"]) {
    const url = new URL(entry, import.meta.url).href;
    const result = await run(["--input-type=module", "-e", `Object.defineProperty(process.versions, 'node', { value: ${JSON.stringify(version)} }); await import(${JSON.stringify(url)});`]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr.trim()).toBe("需要 Node 24 及以上版本，请升级 Node 后重试");
  }
});

it.skipIf(process.platform !== "linux")("prints fixed broker startup diagnostics, but hides unknown errors", async () => {
  const directory = await mkdtemp(join(tmpdir(), "feishu-entry-"));
  try {
    const credentialFile = join(directory, "credential.json");
    const configFile = join(directory, "config.json");
    await writeFile(credentialFile, '{"token":"fixture-secret"}', { mode: 0o640 });
    await writeFile(configFile, JSON.stringify({ credentialFile, tokenUrl: "https://example.invalid/token", socketPath: join(directory, "token.sock") }));
    const known = await run([new URL("./main.mjs", import.meta.url).pathname, configFile]);
    expect(known.status).toBe(1);
    expect(known.stderr.trim()).toBe("凭证文件必须仅 broker 用户可读");
    const unknown = await run([new URL("./main.mjs", import.meta.url).pathname, join(directory, "fixture-private-missing-config")]);
    expect(unknown.status).toBe(1);
    expect(unknown.stderr.trim()).toBe("飞书代领服务启动失败，请检查配置和权限");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it.skipIf(process.platform !== "linux")("prints the fixed socket creation error when listening fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "feishu-entry-socket-"));
  try {
    const credentialFile = join(directory, "credential.json");
    const configFile = join(directory, "config.json");
    await writeFile(credentialFile, '{"token":"fixture-secret"}', { mode: 0o600 });
    await writeFile(configFile, JSON.stringify({ credentialFile, tokenUrl: "https://example.invalid/token", socketPath: join(directory, "token.sock/") }));
    const result = await run([new URL("./main.mjs", import.meta.url).pathname, configFile]);
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe("飞书代领服务无法创建套接字");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
