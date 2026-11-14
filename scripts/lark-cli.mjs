#!/usr/bin/env node
if (Number(process.versions.node.split(".")[0]) < 24) {
  console.error("需要 Node 24 及以上版本，请升级 Node 后重试");
  process.exit(1);
}
const { runLarkCli } = await import("../server/feishu-cli/wrapper.ts");
process.exitCode = await runLarkCli(process.argv.slice(2));
