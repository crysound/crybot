# T-1233：Cry Bot 屏池设置注释补正（只改注释，不改行为）

背景：T-1228 screen-pool（PR #37，已合入 main 98a1914a）第 3 轮审核的注释小建议。`server/local-vm-settings.ts` 里 `localVmConfigSchema` 的 `cpus`、`memoryGb` 字段注释和实际行为不完全一致：

1. `cpus` 注释写「Docker refuses more CPUs than its engine has」，但拒绝超核数的是 Docker 和 Podman 两种引擎（Apple container 等其他运行时不一定）；同句后面的「Stopped containers apply changes on their next start」也只对 Docker/Podman 成立，要和 `memoryGb` 注释一样写明「On Docker and Podman」。
2. `cpus` 注释没说清夹取：调用方传入引擎资源(`localVmResources(config, host)` 的 `host`)且是共享模式时，默认 3 核和用户显式填的值都会被 `clampDesktopResources` 夹到引擎核数(见同文件 `localVmResources` 和 `server/container-limits.ts` 的 `clampDesktopResources`)；未传引擎资源时默认 2 核、不夹。注释要写清这一点，用词用「engine」(容器引擎)，不要写成 host/本机。
3. 顺便核对 `memoryGb` 注释：共享模式传入引擎资源时，默认 8G 按「引擎内存减 2 GiB」夹，显式值只夹到引擎内存本身(不扣 2 GiB)。现注释只写了「shared defaults reserve 2 GiB」，如需补一句显式值的情况就补，保持一句话风格。

要求：
- 只改 `server/local-vm-settings.ts` 中这两处 JSDoc 注释(如 `server/container-limits.ts` 的 `clampDesktopResources` 附近已有注释与之矛盾，可一并改，否则不动)。不改任何代码逻辑、类型、测试、文案翻译。
- 英文，保持文件现有的单行 `/** ... */` 风格和简洁度。
- 验收：`git diff` 只含注释行；`pnpm typecheck` 通过；`git diff --check` 通过。写简短 report 说明改了什么。
