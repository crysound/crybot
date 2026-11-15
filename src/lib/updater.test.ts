import { afterEach, expect, it } from "vitest";
import { setLocale } from "@/lib/i18n";
import { updaterMessage } from "@/lib/updater";

afterEach(() => setLocale("en"));

it("translates fixed native update words at render time, retaining raw diagnostics and exact English", () => {
  const state = { status: "handed-off", message: "The install did not finish: The install took too long.", messageKey: "native.update.installFailed", messageParams: { reason: "The install took too long.", timedOut: "true" } } as const;
  expect(updaterMessage(state)).toBe(state.message);
  setLocale("zh");
  expect(updaterMessage(state)).toBe("安装未完成：安装耗时过长。");
  expect(updaterMessage({ ...state, messageParams: { reason: "E: dpkg lock" } })).toBe("安装未完成：E: dpkg lock");
  expect(updaterMessage({ ...state, messageParams: {} })).toBe(state.message);
  expect(updaterMessage({ ...state, messageKey: "native.update.future" })).toBe(state.message);
  expect(updaterMessage({ ...state, messageKey: "native.lend.terminal.title" })).toBe(state.message);
  expect(updaterMessage({ status: "installing", message: "Installing the update. Enter your password if asked.", messageKey: "native.update.installing" })).toBe("正在安装更新。如有提示，请输入密码。");
  const failed = { status: "error", message: "Couldn't check for updates. Offline detail", messageKey: "native.update.checkFailed", messageParams: { error: "Offline detail" } } as const;
  expect(updaterMessage(failed)).toBe("无法检查更新。Offline detail");
  expect(updaterMessage({ ...failed, messageCode: "network" })).toContain("更新下载中断或服务器不可用。");
  expect(updaterMessage({ ...failed, messageCode: "network" })).not.toContain("Offline detail");
  setLocale("en");
  expect(updaterMessage({ ...failed, messageCode: "network" })).toBe(failed.message);
});

it("says the updater's own words in the app's language, and keeps a message main could not classify", () => {
  setLocale("zh");
  expect(updaterMessage({ status: "error", message: "Not enough disk space to prepare the update. Free some space, then try again.", messageCode: "disk" }))
    .toBe("磁盘空间不足，无法准备更新。请释放一些空间后重试。");
  const restart = { status: "error", retryable: false, message: "Not enough disk space… Quit and reopen Cry Bot before trying the update again.", messageCode: "disk" } as const;
  expect(updaterMessage(restart)).toMatch(/请释放一些空间后重试。 请退出并重新打开 Cry Bot，再尝试更新。$/);
  expect(updaterMessage(restart, { restart: false })).toBe("磁盘空间不足，无法准备更新。请释放一些空间后重试。");
  expect(updaterMessage({ status: "error", message: "HttpError: 418" })).toBe("HttpError: 418");
  expect(updaterMessage(null)).toBeUndefined();
  setLocale("en");
  expect(updaterMessage({ status: "installing", message: "Restart is taking longer than expected. Quit and reopen Cry Bot to finish the update.", messageCode: "slowRestart" }))
    .toBe("Restart is taking longer than expected. Quit and reopen Cry Bot to finish the update.");
});
