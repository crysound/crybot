import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { BOX_ENV_NAMES, BOX_ENV_NEVER, BOX_ENV_CRYBOT_NAMES, BOX_ENV_CRYBOT_PREFIXES, boxEnvironment, boxEnvironmentAllows, instanceEnvNames } from "./env.ts";

/** Every other `CRYBOT_` name the server's code knows: kept on the server unless explicitly granted to one spawn. A name
 * ending in `_` is a family (`CRYBOT_CLOUD_*`). */
const SERVER_ONLY_CRYBOT: ReadonlySet<string> = new Set([
  "CRYBOT_APP_HOST", "CRYBOT_HOSTED_WORKSPACE",
  "CRYBOT_FEISHU_ADMINS", "CRYBOT_FEISHU_ALLOW", "CRYBOT_FEISHU_APP_ID", "CRYBOT_FEISHU_APP_SECRET", "CRYBOT_FEISHU_APP_SECRET_FILE",
  "CRYBOT_FEISHU_SESSION_MAX_DAYS", "CRYBOT_FEISHU_TENANTS", "CRYBOT_FEISHU_TOKEN_ENDPOINT", "CRYBOT_FEISHU_USER_INFO_ENDPOINT",
  // 安全边界：飞书能力只能逐轮显式放行，不能全局继承。
  "CRYBOT_FEISHU_CLI_USERS", "CRYBOT_FEISHU_AUTHORIZATION_URL", "CRYBOT_FEISHU_BROKER_SOCKET",
  "CRYBOT_FEISHU_USER_TOKEN", "CRYBOT_FEISHU_EXPIRES_AT", "CRYBOT_LARK_CLI_EXECUTABLE",
  // 清理整个继承变量族才能阻止未知飞书凭证泄漏；这个扫描命中的前缀不是一个环境变量。
  "CRYBOT_FEISHU_",
  "CRYBOT_ANDROID_CERT_SHA256", "CRYBOT_ANDROID_PACKAGE", "CRYBOT_APPLE_APP_IDS", "CRYBOT_APP_LINK_ORIGIN",
  "CRYBOT_ACP_LIMIT_QUIET_MS", "CRYBOT_ACP_NO_SIGNS_STOP_MS", "CRYBOT_ACP_PLAN_LINES", "CRYBOT_ACP_QUIET_NOTICE_MS",
  "CRYBOT_ACP_QUIET_TICK_MS", "CRYBOT_ACP_SESSION_IDLE_", "CRYBOT_ACP_SHARED_RECYCLE_MS", "CRYBOT_ADMIN_", "CRYBOT_ADMIN_MEMBERSHIP",
  "CRYBOT_ADMIN_URL", "CRYBOT_ADMIN_WORKSPACE", "CRYBOT_AGENT_BROWSER_PATH", "CRYBOT_AI_CHECKS", "CRYBOT_ANTHROPIC_API_KEY",
  "CRYBOT_ANTHROPIC_API_URL", "CRYBOT_APP_SCHEME", "CRYBOT_APP_VERSION", "CRYBOT_ATTACHMENTS_MAX_BYTES", "CRYBOT_AZURE_OPENAI_LIVE_DEPLOYMENT",
  "CRYBOT_AZURE_OPENAI_LIVE_ENDPOINT", "CRYBOT_BOAT_API", "CRYBOT_BOT_BOX", "CRYBOT_BOX_CANARY", "CRYBOT_BRAND_FILE",
  "CRYBOT_BROWSER_CONNECTION", "CRYBOT_BROWSER_IDLE_HANDOVER_MS", "CRYBOT_BROWSER_LANG", "CRYBOT_BROWSER_LEGACY_SHELL",
  "CRYBOT_BROWSER_MAX_RUNNING", "CRYBOT_BROWSER_SANDBOX", "CRYBOT_BROWSER_SCREEN", "CRYBOT_BROWSER_TIMEZONE", "CRYBOT_BROWSER_TIMING",
  "CRYBOT_BUG_REPORT_URL", "CRYBOT_CADDY_PATH", "CRYBOT_CHROME_PATH", "CRYBOT_CLAUDE_AUTOCOMPACT",
  "CRYBOT_CLAUDE_INHERIT_USER_CONFIG", "CRYBOT_CLAUDE_SESSION_IDLE_", "CRYBOT_CLI_OWNER_STDIN", "CRYBOT_CLI_PREFIX",
  "CRYBOT_CLOUDFLARED_PATH", "CRYBOT_CLOUD_", "CRYBOT_CLOUD_ADMIN_URL", "CRYBOT_CLOUD_AI_TOKEN", "CRYBOT_CLOUD_AI_URL",
  "CRYBOT_CLOUD_BOAT_TOKEN", "CRYBOT_CLOUD_BOAT_URL", "CRYBOT_CLOUD_BOOTSTRAP_SECRET", "CRYBOT_CLOUD_CAPS_DROPPED",
  "CRYBOT_CLOUD_CLIENT_IP_HEADER", "CRYBOT_CLOUD_COMPUTER_AUTO_REPLACE", "CRYBOT_CLOUD_COMPUTER_DEAD_CONFIRM_MS", "CRYBOT_CLOUD_COMPUTER_IDLE_MS", "CRYBOT_CLOUD_COMPUTER_START_BUDGET_MS",
  "CRYBOT_CLOUD_CONNECTED_APPS_GRANT", "CRYBOT_CLOUD_DECIDER_TOKEN", "CRYBOT_CLOUD_DECIDER_URL", "CRYBOT_CLOUD_EDGE_ACME_EMAIL",
  "CRYBOT_CLOUD_EDGE_ACME_FALLBACK_ONLY", "CRYBOT_CLOUD_EDGE_BIN", "CRYBOT_CLOUD_EDGE_CERT_ISSUERS",
  "CRYBOT_CLOUD_EDGE_CLIENT_IP_HEADER", "CRYBOT_CLOUD_EDGE_CONFIG", "CRYBOT_CLOUD_EDGE_HOLD", "CRYBOT_CLOUD_EDGE_STORAGE",
  "CRYBOT_CLOUD_EDGE_TLS", "CRYBOT_CLOUD_EDGE_TRUSTED_PROXIES", "CRYBOT_CLOUD_EXPORT_ONLY", "CRYBOT_CLOUD_HARDEN", "CRYBOT_CLOUD_HOSTING_TOKEN", "CRYBOT_CLOUD_HOSTING_URL",
  "CRYBOT_CLOUD_HOME", "CRYBOT_CLOUD_IMAGE", "CRYBOT_CLOUD_LEGACY_ORIGINS", "CRYBOT_CLOUD_MACHINE_ID", "CRYBOT_CLOUD_MOVES",
  "CRYBOT_CLOUD_PUBLIC_HOST", "CRYBOT_CLOUD_ROLE", "CRYBOT_CLOUD_SECRETS_FD", "CRYBOT_CLOUD_STAGING",
  "CRYBOT_CLOUD_STOPPED_HOLD_DAYS", "CRYBOT_CLOUD_TEAM_ID", "CRYBOT_CLOUD_TEAM_LANGUAGE", "CRYBOT_CLOUD_TEAM_NAME",
  "CRYBOT_CLOUD_TRUSTED_PROXIES", "CRYBOT_CLOUD_TUNNEL_BIN", "CRYBOT_CLOUD_TUNNEL_TOKEN", "CRYBOT_CLOUD_VOICE_TOKEN",
  "CRYBOT_CLOUD_VOICE_URL", "CRYBOT_CLOUD_X_TOKEN", "CRYBOT_CLOUD_X_URL", "CRYBOT_CODEX_LAUNCH_SLOTS", "CRYBOT_COMPANION_DIR",
  "CRYBOT_COMPANION_HOSTED_URL", "CRYBOT_COMPANION_INTERNAL_ORIGIN", "CRYBOT_COMPANION_PORT", "CRYBOT_COMPANION_ROUTES",
  "CRYBOT_COMPANION_TAILNET_NAME", "CRYBOT_COMPOSIO_API", "CRYBOT_COMPOSIO_BROKER", "CRYBOT_COMPOSIO_BROKER_TOKEN",
  "CRYBOT_COMPOSIO_BROKER_URL", "CRYBOT_COMPOSIO_TOOLKITS_API", "CRYBOT_COMPUTER_CALL_ACT_WITHIN_MS",
  "CRYBOT_CREDENTIAL_STORE", "CRYBOT_CUSTOM_IMAGE_KEY", "CRYBOT_DATA_DIR", "CRYBOT_DECISION_RETENTION_DAYS",
  "CRYBOT_DEEPSEEK_API_KEY", "CRYBOT_DESKTOP_LAUNCH_ID", "CRYBOT_DESKTOP_PARENT", "CRYBOT_DEVS_STATUS_MS",
  "CRYBOT_DEV_TRUST_LOCAL_BROWSER", "CRYBOT_DISABLE_ANNOUNCEMENTS", "CRYBOT_DISABLE_MODEL_CATALOG_FETCH", "CRYBOT_DISABLE_MODEL_MANIFEST_FETCH", "CRYBOT_DUCKDB_DIR", "CRYBOT_DUCKDB_MAX_TEMP_SIZE",
  "CRYBOT_DUCKDB_MEMORY_LIMIT", "CRYBOT_ELEVENLABS_API", "CRYBOT_ENTERPRISE_DIR", "CRYBOT_ENVIRONMENT_LABEL", "CRYBOT_EOF",
  "CRYBOT_FIRST_REPLY_NOTICE_MS", "CRYBOT_FISH_AUDIO_API", "CRYBOT_FISH_AUDIO_API_KEY", "CRYBOT_FISH_LIVE_AGENT_ID", "CRYBOT_FISH_LIVE_URL", "CRYBOT_FLEET_SOCKET", "CRYBOT_GATE_",
  "CRYBOT_GEMINI_API_KEY", "CRYBOT_GEMINI_IMAGE_KEY", "CRYBOT_GEMINI_TTS_API", "CRYBOT_GOAL_WAIT_MAX_MS",
  "CRYBOT_GREENFERENCE_API_KEY", "CRYBOT_GROQ_API_KEY", "CRYBOT_HELPER_INSTANCE", "CRYBOT_HELPER_MODEL", "CRYBOT_HOOKS", "CRYBOT_HOOK_",
  "CRYBOT_HOSTED_", "CRYBOT_HOSTED_MODELS", "CRYBOT_HOSTED_MODEL_TOKEN", "CRYBOT_HOSTED_MODEL_URL", "CRYBOT_INSTALLATION_CREDENTIAL",
  "CRYBOT_JEV_API_KEY", "CRYBOT_LAN", "CRYBOT_LICENSE_KEY", "CRYBOT_LINUX_GPU", "CRYBOT_LIVE_PROVIDER", "CRYBOT_LOCAL_VM_UPDATE_WAIT_MS",
  "CRYBOT_LOOPBACK_TRUST", "CRYBOT_LOOP_GUARD", "CRYBOT_LOOP_GUARD_STOP_AT", "CRYBOT_META_API_KEY", "CRYBOT_MODELGO_API_KEY", "CRYBOT_NETLIFY_API_URL", "CRYBOT_OPENAI_API_KEY",
  "CRYBOT_OPENAI_IMAGE_KEY", "CRYBOT_OPENAI_LIVE_KEY", "CRYBOT_OPENAI_LIVE_URL", "CRYBOT_OPENROUTER_API_KEY",
  "CRYBOT_OPENROUTER_DECIDER_KEY", "CRYBOT_PERSON_FIRST_MS", "CRYBOT_PHONE_RELAY", "CRYBOT_PHONE_RELAY_URL", "CRYBOT_PHONE_SECRET_PUBLIC_KEY", "CRYBOT_PORT", "CRYBOT_SERVES_TUNNEL", "CRYBOT_POSTIZ_API_KEY",
  "CRYBOT_POSTIZ_CLOUD_URL", "CRYBOT_PROCESS_ID", "CRYBOT_PROVIDER_LOCK", "CRYBOT_PUBLIC_IPV4", "CRYBOT_PUBLIC_URL", "CRYBOT_QUOTA_SWITCH",
  "CRYBOT_REPLAY_TOOL_HISTORY", "CRYBOT_ROOM_SESSIONS", "CRYBOT_SAFETY_FLOOR", "CRYBOT_SERVER_COMPILE_CACHE", "CRYBOT_SERVER_NAME",
  "CRYBOT_SERVER_UPDATE_DIR",
  "CRYBOT_SESSION_IDLE_MIN_MS", "CRYBOT_SESSION_IDLE_MS", "CRYBOT_SESSION_MAX_DAYS", "CRYBOT_SESSION_TTL_DAYS",
  "CRYBOT_SHARED_WORKSPACE_FULL_ACCESS", "CRYBOT_SIGNIN_EMAILS", "CRYBOT_SIGNIN_MEMBER_EMAILS", "CRYBOT_SIGNIN_SMTP_FROM",
  "CRYBOT_SIGNIN_SMTP_URL", "CRYBOT_SKILLS_DIR", "CRYBOT_SMOKE_BUNDLED_CUA", "CRYBOT_SMOKE_CUA", "CRYBOT_SMOKE_KEEP_OPEN",
  "CRYBOT_SMOKE_TEST", "CRYBOT_SSE_HEARTBEAT_MS", "CRYBOT_STATIC_DIR", "CRYBOT_SYNC_ROOT", "CRYBOT_TAILNET_ADDRESSES", "CRYBOT_TAILNET_NAME", "CRYBOT_TAILNET_SERVED", "CRYBOT_TEAM_AWAY_WINDOW_MS",
  "CRYBOT_TEAM_PRESENCE_GRACE_MS", "CRYBOT_TEST_INTERNAL_CAPABILITY_KEY", "CRYBOT_TEST_ORG_LIBRARY_KEY",
  "CRYBOT_TEST_PLAN_USAGE_FILE", "CRYBOT_TEST_TAILNET_STAND_IN", "CRYBOT_TOOL_STALL_MS", "CRYBOT_TREG_KEY", "CRYBOT_TREG_URL", "CRYBOT_TTS_DEFAULT_VOICE",
  "CRYBOT_TTS_KEY", "CRYBOT_TUNNEL_ORIGIN_PORT", "CRYBOT_TUNNEL_SOCKET", "CRYBOT_TURN_STALL_MS", "CRYBOT_UPDATE_CHANNEL", "CRYBOT_UPDATE_INSTALL",
  "CRYBOT_USER_DATA", "CRYBOT_WARM_SUMMARY", "CRYBOT_WARM_SUMMARY_TIME_SCALE", "CRYBOT_WEBHOOK_PORT", "CRYBOT_WEBHOOK_PUBLIC_URL", "CRYBOT_WEBHOOK_SOCKET",
  "CRYBOT_WORKERS_AI_TOKEN", "CRYBOT_XAI_TTS_API",
  "CRYBOT_ANNOUNCEMENTS_URL", "CRYBOT_BROWSER_ENGINE_URL", "CRYBOT_CODEX_", "CRYBOT_COMPANY_API_KEY", "CRYBOT_CF_ACCESS_ALLOW", "CRYBOT_CF_ACCESS_AUD", "CRYBOT_CF_ACCESS_TEAM_DOMAIN", "CRYBOT_DESKTOP_UPDATES_DIR",
  "CRYBOT_COMPUTER_CALL_WAIT_MS", "CRYBOT_COMPUTER_WAIT_MAX_MS", "CRYBOT_CONTROL_PORT", "CRYBOT_CUA_EMBEDDED",
  "CRYBOT_CUA_SDK_LIBRARY", "CRYBOT_INTERNAL_DATA_DIR_LEASE", "CRYBOT_LOCAL_", "CRYBOT_MODEL_MANIFEST_URL",
  "CRYBOT_PERSONA", "CRYBOT_PHONE_RELAY_TOKEN", "CRYBOT_PROBE_LOCAL_INJECT", "CRYBOT_QWEN_",
  "CRYBOT_TOKEN", "CRYBOT_TOOL_DEFINITIONS", "CRYBOT_TOOL_NAMES", "CRYBOT_TRIAL_CREDIT_KEY",
  "CRYBOT_UPDATE_URL", "CRYBOT_URL",
]);

const ROOT = new URL("../../", import.meta.url);

/** The `CRYBOT_` names in the code the server runs, and in what starts it (the desktop app). */
function knownCryNames(): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(new URL(directory, ROOT), { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) visit(file);
      else if (/\.(?:ts|mts|mjs|cjs|js)$/.test(file) && !/\.test\.|\/testing\/|node-test/.test(file)) files.push(file);
    }
  };
  for (const directory of ["server", "shared", "electron"]) visit(directory);
  const names = new Set<string>();
  for (const file of files) for (const match of readFileSync(new URL(file, ROOT), "utf8").matchAll(/\bCRYBOT_[A-Z0-9_]+\b/g)) names.add(match[0]);
  return [...names].sort();
}

describe("the box's environment allow-list", () => {
  it("keeps what an engine needs and drops the server's own settings and the control plane", () => {
    const kept = boxEnvironment({
      PATH: "/usr/bin", HOME: "/data", LANG: "C.UTF-8", TZ: "Europe/Berlin", LC_ALL: "C", TERM: "xterm",
      ANTHROPIC_API_KEY: "sk-ant-1", ANTHROPIC_BASE_URL: "http://127.0.0.1:18080/b/t/anthropic", CLAUDE_CONFIG_DIR: "/data/.claude",
      OPENAI_API_KEY: "sk-1", CODEX_HOME: "/data/.codex", CRYBOT_HOOK_URL: "http://127.0.0.1:8799/api/internal/hook", CRYBOT_COMMS_TOKEN: "cap",
      HTTPS_PROXY: "http://127.0.0.1:3128", NO_PROXY: "127.0.0.1", NPM_CONFIG_LOGLEVEL: "error", ELECTRON_RUN_AS_NODE: "1",
      CRYBOT_CLOUD_BOOTSTRAP_SECRET: "s", CRYBOT_CLOUD_MACHINE_ID: "m", CRYBOT_CLOUD_ADMIN_URL: "https://a", CRYBOT_LICENSE_KEY: "k",
      CRYBOT_DATA_DIR: "/data/.crybot", CRYBOT_PORT: "8799", CRYBOT_LOOPBACK_TRUST: "owner", AWS_SECRET_ACCESS_KEY: "aws", SSH_AUTH_SOCK: "/x",
      SOME_RANDOM_NAME: "x", EMPTY: undefined,
    });
    expect(Object.keys(kept).sort()).toEqual([
      "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "CLAUDE_CONFIG_DIR", "CODEX_HOME", "CRYBOT_COMMS_TOKEN", "CRYBOT_HOOK_URL", "ELECTRON_RUN_AS_NODE",
      "HOME", "HTTPS_PROXY", "LANG", "LC_ALL", "NO_PROXY", "NPM_CONFIG_LOGLEVEL", "OPENAI_API_KEY", "PATH", "TERM", "TZ",
    ]);
  });

  it("a denied name loses even against an allowing list or prefix, and the never-list beats everything", () => {
    expect(boxEnvironmentAllows("CRYBOT_COMMS_TOKEN")).toBe(true);
    expect(boxEnvironmentAllows("CRYBOT_COMMS_TOKEN", new Set(["CRYBOT_COMMS_TOKEN"]))).toBe(false);
    expect(boxEnvironmentAllows("ANTHROPIC_API_KEY", new Set(["ANTHROPIC_API_KEY"]))).toBe(false);
    expect(boxEnvironmentAllows("CRYBOT_COMPOSIO_BROKER_TOKEN")).toBe(false);
    for (const name of BOX_ENV_NEVER) expect(boxEnvironmentAllows(name), name).toBe(false);
    expect(boxEnvironmentAllows("CRYBOT_CLOUD_ANYTHING")).toBe(false);
    expect(boxEnvironmentAllows("CRYBOT_CLOUDFLARED_PATH")).toBe(false);
    expect(BOX_ENV_NAMES.has("PATH")).toBe(true);
  });

  // The CLI's session token and server address (server/headless/client.ts, scripts/mcp-server.ts): an operator may put
  // them in the server's environment, and nothing that runs in a box reads them. The engines' own CRYBOT_ keys
  // (CRYBOT_CODEX_API_KEY, CRYBOT_CHATGPT_TOKEN) still pass, and a spawn's allowEnv never lifts these two.
  it("keeps the CLI's session token and server address on the server, and the engines' CRYBOT_ keys in the box", () => {
    const kept = boxEnvironment(
      { CRYBOT_TOKEN: "cry_sess_x", CRYBOT_URL: "http://127.0.0.1:8799", CRYBOT_CODEX_API_KEY: "k", CRYBOT_CHATGPT_TOKEN: "t" },
      new Set(), new Set(["CRYBOT_TOKEN", "CRYBOT_URL"]),
    );
    expect(Object.keys(kept).sort()).toEqual(["CRYBOT_CHATGPT_TOKEN", "CRYBOT_CODEX_API_KEY"]);
  });

  it("keeps what Antigravity's runtime is started with: its harness, its file storage switch and the browser hook", () => {
    for (const name of ["ANTIGRAVITY_HARNESS_PATH", "AGY_ACP_FORCE_FILE_STORAGE", "BROWSER", "GEMINI_HOME"]) expect(boxEnvironmentAllows(name), name).toBe(true);
  });

  it("preserves the lazy container proxy's activation and tool scope", () => {
    const env = { CRYBOT_CONTAINER_LAZY: "1", CRYBOT_CONTAINER_TOOL_SCOPE: JSON.stringify({ browser: false }) };
    expect(boxEnvironment(env)).toEqual(env);
  });

  it("keeps the keys one spawn vouches for, under any name, past the allow-list and the deny, never past the never-list or CRYBOT_", () => {
    const deny = new Set(["OPENCODE_API_KEY", "CRYBOT_COMPOSIO_BROKER_TOKEN"]);
    const allow = new Set(["NANO_GPT_API_KEY", "OPENCODE_API_KEY", "CRYBOT_LICENSE_KEY", "CRYBOT_CLOUD_AI_TOKEN", "CRYBOT_COMPOSIO_BROKER_TOKEN"]);
    const env = { NANO_GPT_API_KEY: "n", OPENCODE_API_KEY: "o", CRYBOT_LICENSE_KEY: "l", CRYBOT_CLOUD_AI_TOKEN: "c", CRYBOT_COMPOSIO_BROKER_TOKEN: "b", DEEPSEEK_API_KEY: "d" };
    expect(boxEnvironment(env, deny, allow)).toEqual({ NANO_GPT_API_KEY: "n", OPENCODE_API_KEY: "o" });
    expect(boxEnvironment(env, deny)).toEqual({});
  });

  it("vouches only for the names the engine instance's own environment set, with its own value", () => {
    expect(instanceEnvNames({ NANO_GPT_API_KEY: "n", OPENCODE_API_KEY: "o", GONE: "g" }, { NANO_GPT_API_KEY: "n", OPENCODE_API_KEY: "server's", PATH: "/usr/bin" }))
      .toEqual(["NANO_GPT_API_KEY"]);
  });

  it("passes only the CRYBOT_ names a boxed process reads; an operator's own settings stay on the server", () => {
    const kept = boxEnvironment({
      CRYBOT_SIGNIN_SMTP_URL: "smtp://user:pass@mail.example.com", CRYBOT_SIGNIN_EMAILS: "a@example.com", CRYBOT_PHONE_SECRET_PUBLIC_KEY: "k",
      CRYBOT_TEST_INTERNAL_CAPABILITY_KEY: "k", CRYBOT_PUBLIC_URL: "https://x", CRYBOT_SOMETHING_NEW: "x", CRYBOT_EXTRA_PATH: "/opt/tools/bin",
      CRYBOT_MCP_TOKEN_BROWSER: "t", CRYBOT_GATE_CONFIG_ab12: "{}", CRYBOT_REMOTE_MCP_CONFIG_cd34: "{}", CRYBOT_HARNESS_URL: "http://127.0.0.1:8799",
    });
    expect(Object.keys(kept).sort()).toEqual(["CRYBOT_EXTRA_PATH", "CRYBOT_GATE_CONFIG_ab12", "CRYBOT_HARNESS_URL", "CRYBOT_MCP_TOKEN_BROWSER", "CRYBOT_REMOTE_MCP_CONFIG_cd34"]);
  });

  it("every CRYBOT_ name the server knows has a decision: passed to a bot's box or kept on the server", () => {
    const passed = (name: string) => BOX_ENV_CRYBOT_NAMES.has(name) || BOX_ENV_CRYBOT_PREFIXES.includes(name);
    const undecided = knownCryNames().filter((name) => !passed(name) && !SERVER_ONLY_CRYBOT.has(name));
    expect(undecided, "add each to BOX_ENV_CRYBOT_NAMES in env.ts if a bot's engine, hook or MCP proxy reads it, else to SERVER_ONLY_CRYBOT here").toEqual([]);
    expect([...BOX_ENV_CRYBOT_NAMES].filter((name) => SERVER_ONLY_CRYBOT.has(name))).toEqual([]);
    for (const name of SERVER_ONLY_CRYBOT) if (!name.endsWith("_")) expect(boxEnvironmentAllows(name), name).toBe(false);
  });

  it("returns a fresh object, never the caller's", () => {
    const source = { PATH: "/usr/bin" };
    const kept = boxEnvironment(source);
    kept.PATH = "/changed";
    expect(source.PATH).toBe("/usr/bin");
  });
});
