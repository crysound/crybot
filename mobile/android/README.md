# Cry Bot Android

这是一个只使用 Android 框架类的 Kotlin WebView 壳，要求 JDK 17、Android SDK 35 和 Gradle 8.11.1。仓库不提交 Gradle wrapper 的 jar；本地可安装对应版本后在此目录执行：

```sh
gradle assembleDebug lintDebug
```

服务地址和登录相关主机在构建时传入：

```sh
CRYBOT_SERVER_URL=https://bot.example.com \
CRYBOT_LOGIN_HOSTS=team.example.com,login.example.com \
gradle assembleDebug
```

也可以使用 Gradle 属性（例如 `gradle -P CRYBOT_SERVER_URL=https://bot.example.com assembleDebug`）。未提供服务地址时，应用首次启动会显示填写地址界面。`CRYBOT_VERSION_CODE` 默认 `1`，`CRYBOT_VERSION_NAME` 默认 `0.1.0`。

release 签名只有在同时提供 `CRYBOT_ANDROID_KEYSTORE`、`CRYBOT_ANDROID_KEYSTORE_PASSWORD`、`CRYBOT_ANDROID_KEY_ALIAS`、`CRYBOT_ANDROID_KEY_PASSWORD` 时才启用；否则 release 保持未签名。
