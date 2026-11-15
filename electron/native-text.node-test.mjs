import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const { LOCALES_DIR, createNativeText, englishText, nativeLanguage } = require("./native-text.cjs");

function packs(t, files) {
  const dir = mkdtempSync(path.join(tmpdir(), "native-text-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const [name, value] of Object.entries(files)) writeFileSync(path.join(dir, name), typeof value === "string" ? value : JSON.stringify(value));
  return dir;
}

test("language tags select English or Simplified Chinese, including legacy fallbacks", (t) => {
  const dir = packs(t, { "en.json": { "native.x": "en" }, "zh.json": { "native.x": "zh" } });
  const language = (tag) => createNativeText({ dir, saved: tag }).language();
  for (const tag of ["zh", "zh-CN", "zh-Hant-TW", "zh-tw"]) assert.equal(language(tag), "zh", tag);
  for (const tag of ["pt-br", "pt-PT", "de-DE", "xx", "", null, 42, "en-GB"]) assert.equal(language(tag), "en", String(tag));
});

test("a code from a page is never a path", (t) => {
  const dir = packs(t, { "en.json": { "native.x": "en" }, "source-hashes.json": { "native.x": "hash" }, "evil.txt": "{}" });
  for (const code of ["../en", "../outside", "source-hashes", "evil", "en/../en", "EN.JSON", "/etc/passwd"]) {
    assert.equal(nativeLanguage(code, dir), null, code);
    const text = createNativeText({ dir, saved: code });
    assert.equal(text.language(), "en", code);
    assert.equal(text.t("native.x"), "en", code);
  }
  assert.equal(nativeLanguage("en", dir), "en");
});

test("a key a language lacks reads in English and parameters fill in", (t) => {
  const dir = packs(t, {
    "en.json": { "native.a": "Forget “{name}”", "native.b": "Only English", "place.local": "This computer", "chat.other": "not main's" },
    "zh.json": { "native.a": "忘记“{name}”", "place.local": "这台电脑", "chat.other": "否" },
  });
  const text = createNativeText({ dir, saved: "zh" });
  assert.equal(text.t("native.a", { name: "Studio" }), "忘记“Studio”");
  assert.equal(text.t("native.a"), "忘记“{name}”");
  assert.equal(text.t("native.b"), "Only English");
  assert.equal(text.t("place.local"), "这台电脑");
  assert.equal(text.t("chat.other"), "chat.other");
});

test("shared native controls reuse the renderer's catalog in Chinese", () => {
  const text = createNativeText({ saved: "en" });
  const controls = ["rail.thisComputer", "rail.remove", "cloudHome.tryAgain", "computer.windows.start", "mcp.turnOn", "cloudSetup.myCloud", "computer.badge.local"];
  assert.deepEqual(controls.map(key => text.t(key)), ["This computer", "Remove from list", "Try again", "Start screen control", "Turn on", "My Cloud", "this computer"]);
  text.set("zh");
  assert.deepEqual(controls.map(key => text.t(key)), ["这台电脑", "从列表中移除", "重试", "启动屏幕控制", "开启", "My Cloud", "这台电脑"]);
});

test("saved language wins, empty follows the system, and deleted languages fall back", (t) => {
  const dir = packs(t, { "en.json": { "native.x": "en" }, "zh.json": { "native.x": "zh" } });
  let system = "";
  const text = createNativeText({ dir, saved: "pt-br", system: () => system });
  assert.equal(text.t("native.x"), "en");
  system = "zh-CN";
  assert.equal(text.t("native.x"), "en");
  assert.equal(text.set("zh"), true);
  assert.equal(text.t("native.x"), "zh");
  assert.equal(text.set("zh-TW"), false, "the same normalized pack");
  system = "en-US";
  assert.equal(text.set(""), true);
  assert.equal(text.t("native.x"), "en");
  const broken = createNativeText({ dir, system: () => { throw new Error("not ready"); } });
  assert.equal(broken.t("native.x"), "en");
});

test("window language is followed while no preference is saved", (t) => {
  const dir = packs(t, { "en.json": { "native.x": "en" }, "zh.json": { "native.x": "zh" } });
  const text = createNativeText({ dir, saved: null, system: () => "zh-CN" });
  assert.equal(text.t("native.x"), "zh");
  assert.equal(text.follow("en"), true);
  assert.equal(text.t("native.x"), "en");
  assert.equal(text.follow("en"), false);
  for (const code of ["../en", "xx", null]) {
    text.follow("en");
    assert.equal(text.follow(code), true, String(code));
    assert.equal(text.t("native.x"), "zh", `${code}: system fallback`);
  }
  assert.equal(text.follow("zh"), false);
  assert.equal(text.set("zh"), false);
  assert.equal(text.t("native.x"), "zh");
});

test("dates and lists follow the app language", (t) => {
  const dir = packs(t, { "en.json": {}, "zh.json": {} });
  const zh = createNativeText({ dir, saved: "zh", system: () => "en-US" });
  assert.equal(zh.intlTag(), "zh");
  assert.equal(zh.listFormat(["Ana", "Bo", "Cy"]), "Ana、Bo和Cy");
  const en = createNativeText({ dir, saved: "en", system: () => "en-GB" });
  assert.equal(en.intlTag(), "en-GB");
  assert.equal(en.listFormat(["Ana", "Bo", "Cy"]), "Ana, Bo and Cy");
  assert.equal(createNativeText({ dir, saved: "zh-TW", system: () => "zh-TW" }).intlTag(), "zh-TW");
});

test("the shipped catalog has English native keys and Chinese fallback", () => {
  const en = JSON.parse(readFileSync(path.join(LOCALES_DIR, "en.json"), "utf8"));
  const zh = JSON.parse(readFileSync(path.join(LOCALES_DIR, "zh.json"), "utf8"));
  const keys = Object.keys(en).filter((key) => key.startsWith("native."));
  assert.ok(keys.length > 100);
  for (const key of keys) assert.equal(englishText.t(key), en[key], key);
  const text = createNativeText({ saved: "zh" });
  for (const key of keys) assert.equal(text.t(key), zh[key] ?? en[key], key);
  assert.equal(text.t("place.local"), zh["place.local"]);
});

test("team controls use the current language and retain only their own keys", (t) => {
  const dir = packs(t, {
    "en.json": { "teamMove.title": "Move {bot} to {team}?", "chat.other": "not main's" },
    "zh.json": { "teamMove.title": "将{bot}移至{team}？" },
  });
  const text = createNativeText({ dir, saved: "zh" });
  assert.equal(text.t("teamMove.title", { bot: "Atlas", team: "Acme" }), "将Atlas移至Acme？");
  assert.equal(text.t("chat.other"), "chat.other");
});
