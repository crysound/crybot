# Cry Bot 自托管登录与桌面发行

服务监听 `127.0.0.1`，由 Cloudflare Tunnel 转发。先在 Cloudflare Access 创建应用和允许访问的策略，再给服务进程设置：

```sh
export CRYBOT_CF_ACCESS_TEAM_DOMAIN=example.cloudflareaccess.com
export CRYBOT_CF_ACCESS_AUD=application-aud,another-application-aud
export CRYBOT_CF_ACCESS_ALLOW='*'
```

三个变量必须一起设置；全部不设时保留原来的本机访问和配对方式。团队域名不带 `https://` 或路径，AUD 是 Access 应用的 audience tag。服务用团队域名的 HTTPS JWKS 验证 JWT 签名、issuer、audience 和有效期，复用密钥缓存。

`ALLOW=*` 接受所有已通过 Access 的身份，不要求邮箱。也可以设成 `owner@example.com,another@example.com`，按 JWT 的 `email` 忽略大小写匹配。通过后签发单用户 owner 会话（含管理权限）；签发时长、续期和上限与邮箱登录一致，由现有 `CRYBOT_SESSION_TTL_DAYS`（默认 30 天）和 `CRYBOT_SESSION_MAX_DAYS`（默认 180 天）控制。有效 Cry Bot 会话优先，不重复签发新会话。Access 策略仍应保护整个应用，撤销 Access 用户后不要允许其绕过 Access 直连服务。

反向代理需保留 `Cf-Access-Jwt-Assertion`、外部 Host，以及正确的 `X-Forwarded-Proto: https`，使浏览器收到 Secure、HttpOnly 会话 cookie。无效 JWT 返回 401，名单外身份返回 403；公开的健康检查等接口保持原行为。

## 安装包与更新文件

```sh
export CRYBOT_DESKTOP_UPDATES_DIR=/srv/crybot/desktop-updates
```

把发行文件和 electron-builder 生成的 `latest.yml`、`latest-mac.yml`、blockmap 等文件放进这个目录。下载地址例如 `https://example.com/desktop-updates/latest.yml`。在 Access 中为 `/desktop-updates/*` 配置 Bypass，使安装器和自动更新器不需要交互登录。

下载路由只接受 GET/HEAD，支持单个字节 Range；桌面 generic 源关闭多段 Range 合并，差分更新逐段下载。不列目录；目录、缺失文件、路径穿越和逃逸目录的符号链接返回 404。YAML 元数据不缓存，安装包可以缓存一小时。更新目录只能放公开发行文件，并应由可信发行进程管理。发布时最后替换元数据，避免客户端读到尚未上传的安装包。

## 桌面构建

在打包进程中设置（不是服务端运行时配置）：

```sh
export CRYBOT_DEFAULT_SERVER_URL=https://example.com
export CRYBOT_LOGIN_HOSTS=example.cloudflareaccess.com,login.example.com
export CRYBOT_UPDATE_FEED_URL=https://example.com/desktop-updates/
pnpm package:mac
# 或 pnpm package:win
```

打包脚本明确使用 `electron-builder.config.cjs`。构建钩子生成被 git 忽略的 `dist-electron/desktop-config.json`，并复制到安装包 Resources 中。不要提交带部署值的生成文件。

首次启动且没有 `environments.json` 时，默认服务器作为当前远程环境保存，主窗口直接加载该地址，由 Access 在窗口内完成登录。之后保存的环境选择优先；仍可从服务器设置切回本机或其他服务器。远程接口请求使用窗口的默认 Electron session cookie，不需要配对令牌。

`LOGIN_HOSTS` 为逗号分隔的精确主机名，不带协议、端口、路径或通配符。填写 Access 域名及身份提供方在登录过程中实际跳转的主机。服务器主机自动允许；名单外 HTTP(S) 链接交给系统浏览器。登录主机不会因此获得 Cry Bot 页面专属的本机 IPC 权限。

更新源只使用指定的 generic HTTP(S) 地址。没有 `UPDATE_FEED_URL` 时不产生 publish 配置，运行时不加载更新器、不轮询，也不显示更新错误。更改更新源需要重新构建应用。

macOS 构建保持 hardened runtime，包含 dmg 和自动更新需要的 zip，并使用 `build/entitlements.mac.plist`。CI 提供 Developer ID 签名配置；同时提供 `APPLE_API_KEY`（密钥文件路径）、`APPLE_API_KEY_ID` 和 `APPLE_API_ISSUER` 才开启公证。缺少其中任一变量时关闭公证。本地无证书构建可设置 `CSC_IDENTITY_AUTO_DISCOVERY=false`。Windows NSIS 不签名。

## 离线验证

```sh
pnpm vitest run server/cf-access.test.ts server/routes/desktop-update-files.test.ts electron/desktop-build-config.test.mjs electron/updater.test.mjs --maxWorkers=2
pnpm build:server
node scripts/smoke-selfhost-login.mjs
```

冒烟脚本要求 Node 24、curl 和监听本机临时端口的权限。脚本生成临时密钥、启动本机假 JWKS，将构建服务端的 JWKS fetch 映射到该服务，使用临时数据目录及假引擎，并阻断其他外部 fetch；生产代码没有跳过 JWT 校验或替换 JWKS 地址的环境开关。脚本打印 curl 命令及响应，验证 JWT、cookie、健康接口和公开下载后清理 fixture。
