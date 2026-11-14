# T-1235 灵动岛焦点与设置保存修复报告

日期：2026-11-14。状态：本地实现完成，未提交 git。

## 改动

- `electron/island.mjs` 在处理 `island:action` 前记录是否已经处于 `list` 或 `chat`。只有 action 将形态从两者之外带入 `list`/`chat` 时，才按 `setFocusable(true)`、`showInactive()`、`focus()` 的顺序取焦点；list↔chat、typing 等停留在展开形态内的 action 不再重复取焦点。收起时原有 `blur`、`setFocusable(false)` 和鼠标忽略逻辑保持不变。
- `electron/island.node-test.mjs` 让 fixture 记录 `setFocusable`，焦点回归用例在 expand 前清空调用记录，断言三次调用的顺序和次数；随后 select 进入 chat 并连续发送两次 typing，断言没有新增焦点调用。
- `src/components/IslandSettings.tsx` 保存失败时清除本地宽度预览，使滑块和 output 回到 `settings.width`。开关保存失败时设置状态不会更新，因此仍显示已保存值。
- `src/components/IslandSettings.test.ts` 增加 `set` 拒绝时宽度预览恢复到已保存值的用例。

## 变异自检

临时删除 action 处理中的 `showInactive()` 后运行
`node --test --test-force-exit --test-concurrency=1 electron/island.node-test.mjs`，退出码为 1；恢复 `showInactive()` 后同一命令通过。变异期间没有保留改动。

## 验证

依赖按要求建立为 `node_modules -> /root/workspace/crybot/node_modules`。本环境的 `pnpm` 不在 PATH，`corepack pnpm` 又需要联网下载；`systemd-run --scope` 也因沙箱无法连接 system bus（`Operation not permitted`）不可用，所以测试使用直接命令执行。

逐文件 Node 测试均通过，末尾输出如下：

```text
node --test --test-force-exit --test-concurrency=1 electron/island.node-test.mjs
1..1
# tests 1
# pass 1
# fail 0
```

```text
node --test --test-force-exit --test-concurrency=1 electron/island-model.node-test.mjs
1..1
# tests 1
# pass 1
# fail 0
```

```text
node --test --test-force-exit --test-concurrency=1 electron/island-page.node-test.mjs
1..1
# tests 1
# pass 1
# fail 0
```

Vitest 要求的命令因环境缺少 pnpm 均输出 `/bin/bash: line 1: pnpm: command not found`。使用已存在的 `node_modules/.bin/vitest`、临时可写 Vite 配置（仅解决沙箱的只读 `.vite-temp`）运行 IslandSettings 用例，3 个用例通过：

```text
Test Files  1 passed (1)
Tests  3 passed (3)
```

`src/components/Island.test.ts` 在本次基线中不存在；直接运行对应筛选得到 `No test files found, exiting with code 1`。

`node_modules/.bin/tsc -b` 通过；改动的 4 个文件运行
`node_modules/.bin/oxlint --deny-warnings ...` 通过；`git diff --check` 通过。

`docs/verification/README.md` 在本次检出中不存在，无法按其配方启动隔离 fixture。没有访问或修改用户的真实应用和数据；完整 GitHub Actions 验收仍以协调者推送后的结果为准。
