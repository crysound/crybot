#!/usr/bin/env node
if (Number(process.versions.node.split(".")[0]) < 24) {
  console.error("需要 Node 24 及以上版本，请升级 Node 后重试");
  process.exit(1);
}
const { readFile } = await import("node:fs/promises");
const { startBroker, BrokerStartupError } = await import("../../server/feishu-cli/broker.ts");
try {
  const broker = await startBroker(JSON.parse(await readFile(process.argv[2], "utf8")));
  for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => { void broker.close(); });
} catch (error) {
  console.error(error instanceof BrokerStartupError ? error.message : "飞书代领服务启动失败，请检查配置和权限");
  process.exitCode = 1;
}
