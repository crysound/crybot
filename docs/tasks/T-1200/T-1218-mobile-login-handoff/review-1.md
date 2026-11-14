# T-1218 第 1 轮审核意见（协调者整理）

结论：普通审核通过，无必改项；安全审查不通过（令牌明文，见 r2 第 1 条）。

## 本轮要一起处理的建议

1. `server/index.ts` 约 12570 行：Access 已拒绝（`refusal` 非空）时仍把 `/auth/app-handoff` 转给接力处理器，把原来的 403 JSON 变成空 body 的 401。删掉这条特例，拒绝走原有 JSON 返回。
2. 服务器地址带子路径（如 `https://host/sub`）时，iOS `ViewController.swift` 的 `url.path = "/auth/app-handoff"` 和安卓 `MainActivity.kt` 的 `.path("/auth/app-handoff")` 会落到根路径。改为在原路径后追加（处理末尾斜杠）。
3. 安卓挂起的 `login_state` 没有过期时间，冷启动会一直被「登录尚未完成」面板拦住。给 state 记时间戳，超过 10 分钟作废并正常加载网页。私钥（若存 SharedPreferences）同样作废删除。
4. 安卓 `onCreateWindow` 新建的弹窗 WebView 只在 `shouldOverrideUrlLoading` 时销毁，`window.open("")` 后不导航会泄漏。在 `onCloseWindow` 里也销毁，并限制同时只有一个弹窗。

## 不在本任务处理

- `cf-access.ts` 校验逻辑与 `createCfAccess` 重复：等另一任务（T-1217）合并后由协调者统一收拢。
- `index.ts` 挂载顺序的集成验证：协调者在外面补。
- `CF_Binding` Cookie：协调者核对部署配置。
