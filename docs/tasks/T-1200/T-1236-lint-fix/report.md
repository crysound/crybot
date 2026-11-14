# T-1236 验收报告

## 改动

- `scripts/public-scan/scan.mjs` 使用 `String.raw` 提供的 Unicode 转义构造控制字符正则，保持路径中 `U+0000`–`U+001F` 和 `U+007F` 替换为 `?` 的行为。
- `server/lazy-container-mcp.ts` 将 `pending` 集合直接传给 `Promise.allSettled`，移除多余的数组转换。

## 验证

- `pnpm exec oxlint --deny-warnings .`：通过，退出码 0，无输出。
- `node --test scripts/public-scan/scan.node-test.mjs`：通过，1 个测试通过，0 个失败。
- `pnpm exec vitest run server/lazy-container-mcp.test.ts`：通过，1 个测试文件、11 个测试通过。
- 沙箱禁止监听 TCP 端口，e2e 测试未运行，以 Actions 结果为准。
