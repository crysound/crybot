import type { AppConfig } from "../config.ts";

export function instaboxApiKey(cfg: Pick<AppConfig, "instabox">): string | null {
  return process.env.INSTABOX_API_KEY?.trim() || cfg.instabox?.apiKey?.trim() || null;
}

export function instaboxConfigured(cfg: Pick<AppConfig, "instabox">): boolean {
  return instaboxApiKey(cfg) !== null;
}

export function stripInstaboxCredentialEnv(env: Record<string, string | undefined>): void {
  for (const key of Object.keys(env)) if (key.toUpperCase() === "INSTABOX_API_KEY") delete env[key];
}
