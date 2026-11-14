// The environment a boxed process gets: an allow-list, never the server's whole environment. The drivers already strip
// the workspace credentials and every CRYBOT_CLOUD_ setting before a spawn (server/config.ts stripWorkspaceCredentialEnv);
// this is the second gate, applied at the box boundary, so a name a driver forgot never reaches a bot's shell.

/** Names a bot's engine, its tools and the proxies CryBot starts inside the box may read. */
export const BOX_ENV_NAMES: ReadonlySet<string> = new Set([
  "PATH", "HOME", "USER", "LOGNAME", "SHELL", "HOSTNAME", "PWD",
  "LANG", "LANGUAGE", "TZ", "TERM", "COLORTERM", "TMPDIR", "NO_COLOR", "FORCE_COLOR", "CI", "DEBUG",
  "NODE_ENV", "NODE_OPTIONS", "NODE_EXTRA_CA_CERTS", "NODE_USE_ENV_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR", "CURL_CA_BUNDLE",
  "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "no_proxy", "all_proxy",
  "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME", "XDG_RUNTIME_DIR", "DISPLAY", "WAYLAND_DISPLAY",
  "AGENT_BROWSER_EXECUTABLE_PATH", "BROWSER", "BASH_MAX_TIMEOUT_MS", "ELECTRON_RUN_AS_NODE", "PYTHONUNBUFFERED", "PYTHONDONTWRITEBYTECODE",
  "GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL",
]);

/** CryBot's own variables a boxed process reads: what the harness sets for a bot's engine, its hooks and the MCP
 * proxies it starts. Security: no other `CRYBOT_` name passes, whatever the operator set on the server (an SMTP URL, a
 * token); env.test.ts lists every `CRYBOT_` name the server knows, so a new one needs a decision. */
export const BOX_ENV_CRYBOT_NAMES: ReadonlySet<string> = new Set([
  "CRYBOT_HARNESS_URL", "CRYBOT_BOT_ID", "CRYBOT_THREAD_ID", "CRYBOT_COMMS_TOKEN", "CRYBOT_TURN_DEPTH", "CRYBOT_EXTERNAL_RUNTIME",
  "CRYBOT_CHIEF_OF_STAFF", "CRYBOT_BOTBOT", "CRYBOT_SKILL_AUTHORING_ENABLED", "CRYBOT_MEMORY_ENABLED", "CRYBOT_SHARED_COMPUTERS_ENABLED",
  "CRYBOT_VOICE_NOTES", "CRYBOT_X_RESEARCH", "CRYBOT_RESEARCH", "CRYBOT_TEAM_PEOPLE", "CRYBOT_COMPUTER_SELECTION", "CRYBOT_ROOM",
  "CRYBOT_IMAGE_GENERATION", "CRYBOT_MEETINGS", "CRYBOT_APP_HOSTING", "CRYBOT_AGENTS_TOOL_BRIDGE", "CRYBOT_TOOL_LIMIT", "CRYBOT_TOOL_SCHEMA_PROFILE",
  "CRYBOT_MCP_CONFIG", "CRYBOT_MCP_RESTART", "CRYBOT_MCP_RESULT_BUDGET",
  "CRYBOT_HOOK_URL", "CRYBOT_HOOK_TOKEN_FILE", "CRYBOT_HOOK_TIMEOUT_MS", "CRYBOT_PERMISSION_TOOL_SCOPE",
  "CRYBOT_CONNECTOR_UPSTREAM_URL", "CRYBOT_CONNECTOR_UPSTREAM_HEADERS", "CRYBOT_CONNECTOR_TOKEN", "CRYBOT_CONNECTOR_ALLOWED_TOOLS",
  "CRYBOT_CONNECTOR_SERVICE_SLUGS", "CRYBOT_CONNECTOR_APP_TOOLS", "CRYBOT_CONNECTOR_APP_TOOL_NAMES",
  "CRYBOT_GATE_NAME", "CRYBOT_GATE_UPSTREAM", "CRYBOT_GATE_BUDGET", "CRYBOT_GATE_SPILL_DIR", "CRYBOT_GATE_SPILL_HINT", "CRYBOT_GATE_TOOL_SCOPE",
  "CRYBOT_GATE_DIRECTORY", "CRYBOT_GATE_APPS", "CRYBOT_REMOTE_MCP_SERVER", "CRYBOT_REMOTE_MCP_DIRECTORY", "CRYBOT_REMOTE_MCP_APPS",
  "CRYBOT_CONTROL_URL", "CRYBOT_CONTROL_TOKEN", "CRYBOT_COMPUTER_JOURNAL", "CRYBOT_CUA_ARGS", "CRYBOT_CUA_COMMAND", "CRYBOT_CUA_PLATFORM",
  "CRYBOT_PHONE_TOKEN", "CRYBOT_ADB_PATH", "CRYBOT_RESOURCES_PATH", "CRYBOT_CODEX_AUTH_SOCKET", "CRYBOT_CODEX_AUTH_SECRET",
  "CRYBOT_COPILOT_MCP_CONFIG", "CRYBOT_BROWSER_PROFILE", "CRYBOT_BOX_PROBE", "CRYBOT_EXTRA_PATH", "CRYBOT_TEST_SEALED_PATH",
  "CRYBOT_CODEX_API_KEY", "CRYBOT_CHATGPT_TOKEN",
]);
/** Families of the same, one variable per server or kind: a harness MCP server's token, a gated or remote server's config. */
export const BOX_ENV_CRYBOT_PREFIXES: readonly string[] = ["CRYBOT_MCP_TOKEN_", "CRYBOT_GATE_CONFIG_", "CRYBOT_REMOTE_MCP_CONFIG_"];

/** Prefixes of the engines' own settings and keys (T0b replaces the keys with per-turn broker tokens). */
export const BOX_ENV_PREFIXES: readonly string[] = [
  "LC_", "CRYBOT_", "NPM_CONFIG_", "npm_config_",
  "ANTHROPIC_", "CLAUDE_", "CODEX_", "OPENAI_", "OPENCODE_", "OPENROUTER_", "GEMINI_", "GOOGLE_", "GROK_", "XAI_",
  "MISTRAL_", "CEREBRAS_", "GROQ_", "GREENFERENCE_", "MODELGO_", "META_", "MINIMAX_", "KIMI_", "MOONSHOT_", "CURSOR_", "FACTORY_", "CLINE_", "HERMES_",
  "MUSE_", "PI_", "DWEB_", "UNSLOTH_", "FAKE_CLAUDE_", "MCP_", "ANTIGRAVITY_", "AGY_",
];

/** Never, whatever the allow-list says: the control plane's settings and secrets, and the server's own placement. The
 * CLI's session token and server address (server/headless/client.ts) too: nothing in a box reads them, and one an
 * operator set on the server would otherwise pass under the engines' CRYBOT_ prefix. */
export const BOX_ENV_NEVER: ReadonlySet<string> = new Set([
  "CRYBOT_INSTALLATION_CREDENTIAL", "CRYBOT_LOOPBACK_TRUST", "CRYBOT_CLOUD_SECRETS_FD",
  "CRYBOT_DATA_DIR", "CRYBOT_STATIC_DIR", "CRYBOT_DUCKDB_DIR", "CRYBOT_PORT", "CRYBOT_WEBHOOK_PORT",
  "CRYBOT_TOKEN", "CRYBOT_URL",
]);
export const BOX_ENV_NEVER_PREFIXES: readonly string[] = ["CRYBOT_CLOUD_"];

/** `allow` is what one spawn vouches for: the keys the person saved for its engine, under whatever name that engine reads
 * (NANO_GPT_API_KEY, OPENCODE_API_KEY). Security: it lifts the allow-list and `deny` for that process only, and never for
 * a name of CryBot's own (`CRYBOT_`) or one on the never-list. */
export function boxEnvironmentAllows(name: string, deny: ReadonlySet<string> = new Set(), allow: ReadonlySet<string> = new Set()): boolean {
  if (BOX_ENV_NEVER.has(name) || BOX_ENV_NEVER_PREFIXES.some((prefix) => name.startsWith(prefix))) return false;
  if (allow.has(name) && !name.startsWith("CRYBOT_")) return true;
  if (deny.has(name)) return false;
  if (name.startsWith("CRYBOT_")) return BOX_ENV_CRYBOT_NAMES.has(name) || BOX_ENV_CRYBOT_PREFIXES.some((prefix) => name.startsWith(prefix));
  return BOX_ENV_NAMES.has(name) || BOX_ENV_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/** The box's environment: the allowed names of `env` with a value, in a fresh object. `deny` adds names (the workspace
 * credentials) that are refused even when a prefix would allow them. */
export function boxEnvironment(
  env: Record<string, string | undefined>,
  deny: ReadonlySet<string> = new Set(),
  allow: ReadonlySet<string> = new Set(),
): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined || !boxEnvironmentAllows(name, deny, allow)) continue;
    kept[name] = value;
  }
  return kept;
}

/** The names of `env` that hold the value `instance` gave them: what the environment configured for one engine instance
 * (its saved keys) put in a spawn, for that spawn's `allowEnv`. */
export function instanceEnvNames(instance: Readonly<Record<string, string>>, env: Record<string, string | undefined>): string[] {
  return Object.keys(instance).filter((name) => env[name] !== undefined && env[name] === instance[name]);
}
