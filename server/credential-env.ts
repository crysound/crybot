// Credential env names and the strippers that keep them out of child processes. Lives apart from
// config.ts so the lists can grow (one name per engine) without that file growing with them.

/** Workspace credential env names; spawned engine CLIs must never inherit them. */
export const WORKSPACE_CREDENTIAL_ENV = [
  "XAI_API_KEY",
  "MISTRAL_API_KEY",
  "CEREBRAS_API_KEY",
  "CRYBOT_GROQ_API_KEY",
  "CRYBOT_GREENFERENCE_API_KEY",
  "CRYBOT_MODELGO_API_KEY",
  "CRYBOT_META_API_KEY",
  "CRYBOT_DEEPSEEK_API_KEY",
  "CRYBOT_ANTHROPIC_API_KEY",
  "CRYBOT_ANTHROPIC_API_URL",
  "CRYBOT_HOSTED_MODEL_TOKEN",
  "CRYBOT_HOSTED_MODELS",
  "OPENAI_COMPAT_API_KEY",
  "OPENAI_COMPAT_URL",
  "CRYBOT_OPENAI_API_KEY",
  "CRYBOT_OPENROUTER_API_KEY",
  "BOX_TOKEN",
  "OPENCODE_API_KEY",
  "CRYBOT_TTS_KEY",
  "CRYBOT_FISH_AUDIO_API_KEY",
  "CRYBOT_GEMINI_API_KEY",
  "CRYBOT_JEV_API_KEY",
  "CRYBOT_OPENROUTER_DECIDER_KEY",
  "CRYBOT_WORKERS_AI_TOKEN",
  "CRYBOT_OPENAI_IMAGE_KEY",
  "CRYBOT_CUSTOM_IMAGE_KEY",
  "CRYBOT_GEMINI_IMAGE_KEY",
  "CRYBOT_OPENAI_LIVE_KEY", "CRYBOT_TREG_KEY", "CRYBOT_POSTIZ_API_KEY",
  "COMPOSIO_API_KEY",
  "CRYBOT_COMPOSIO_BROKER_TOKEN",
  "CRYBOT_CLOUD_BOAT_TOKEN",
  "CRYBOT_CLOUD_VOICE_TOKEN",
  "CRYBOT_CLOUD_DECIDER_TOKEN",
  "CRYBOT_CLOUD_AI_TOKEN", "CRYBOT_CLOUD_X_TOKEN", "CRYBOT_CLOUD_HOSTING_TOKEN", "CRYBOT_CLOUD_CONNECTED_APPS_GRANT",
  // Not credentials, but they point a shell-capable agent at app-owned state.
  "CRYBOT_BROWSER_CONNECTION", "CRYBOT_USER_DATA", "CRYBOT_BOAT_API",
] as const;

/** Operator secrets only this process reads, plus every `CRYBOT_CLOUD_` var (the underscore leaves out CRYBOT_CLOUDFLARED_PATH). */
export const CONTROL_PLANE_ENV = ["CRYBOT_INSTALLATION_CREDENTIAL", "CRYBOT_PHONE_RELAY_TOKEN", "CRYBOT_COMPOSIO_BROKER_TOKEN"] as const;
export const CONTROL_PLANE_ENV_PREFIX = "CRYBOT_CLOUD_";

/** Names compare case-insensitively because Windows environments do. */
export function stripControlPlaneEnv(env: Record<string, string | undefined>): void {
  for (const key of Object.keys(env)) {
    const name = key.toUpperCase();
    if (name.startsWith(CONTROL_PLANE_ENV_PREFIX) || (CONTROL_PLANE_ENV as readonly string[]).includes(name)) delete env[key];
  }
}

export function stripWorkspaceCredentialEnv(env: Record<string, string | undefined>): void {
  for (const key of WORKSPACE_CREDENTIAL_ENV) delete env[key];
  stripControlPlaneEnv(env);
}

const DESKTOP_STORE_KEY_ENV: ReadonlySet<string> = new Set(["MISTRAL_API_KEY", "CEREBRAS_API_KEY", "OPENAI_COMPAT_API_KEY", "CRYBOT_OPENAI_API_KEY", "CRYBOT_OPENROUTER_API_KEY"]);

/** A key an operator set on the server. Security: under the desktop app these variables hold workspace keys from its
 * encrypted store, which reach only the instances the workspace routes, never one with a URL of its own. */
export function operatorEnvKey(name: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.CRYBOT_DESKTOP_PARENT === "1" && DESKTOP_STORE_KEY_ENV.has(name) ? undefined : env[name];
}

/** Env a provider CLI may read as its billing identity; a foreign key must never move a subscription CLI onto API billing. */
export const PROVIDER_CREDENTIAL_ENV = [
  "CLINE_API_KEY",
  "ANTHROPIC_API_KEY",
  "FACTORY_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "KIMI_API_KEY",
  "MOONSHOT_API_KEY",
  "MINIMAX_API_KEY",
  "OPENAI_API_KEY",
  "OPENCODE_API_KEY",
  "XAI_API_KEY",
  "MISTRAL_API_KEY",
  "CEREBRAS_API_KEY",
  "GROQ_API_KEY",
  "GREENFERENCE_API_KEY",
  "MODELGO_API_KEY",
  "META_API_KEY",
  "DEEPSEEK_API_KEY",
  "CURSOR_API_KEY",
  "CURSOR_AUTH_TOKEN",
] as const;

/** Provider keys OpenCode reads from its environment (with ANTHROPIC_API_KEY set it lists Anthropic's models). */
export const OPENCODE_PROVIDER_ENV = [
  "CLINE_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "KIMI_API_KEY",
  "MOONSHOT_API_KEY",
  "MINIMAX_API_KEY",
  "GROQ_API_KEY",
  "DEEPSEEK_API_KEY",
] as const;
