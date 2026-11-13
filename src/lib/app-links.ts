export const APP_NAME = "Cry Bot";
export const APP_REPOSITORY = "https://github.com/crysound/crybot";
export const DOCS_URL = `${APP_REPOSITORY}#readme`;
export const HELP_CENTER_URL = DOCS_URL;
export const APPROVAL_LEVELS_URL = `${APP_REPOSITORY}#readme`;
export const PASSKEY_HELP_URL = HELP_CENTER_URL;
export const FEEDBACK_URL = `${APP_REPOSITORY}/issues`;
export const RELEASES_URL = `${APP_REPOSITORY}/releases`;
export const PRICING_URL = "";
export const CLOUD_PLAN_URL = "";
export function withSource(url: string, source: string): string {
  if (!url) return "";
  const target = new URL(url);
  target.searchParams.set("src", source);
  return target.href;
}
export const LICENSE_URL = `${APP_REPOSITORY}/blob/main/LICENSE`;

export function appVersion(): string {
  return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";
}

export function desktopAppVersion(): string {
  return (typeof window !== "undefined" && window.cry?.app?.version) || appVersion();
}

const PLATFORM_NAMES: Record<string, string> = {
  darwin: "macOS",
  win32: "Windows",
  linux: "Linux",
};

export function platformLabel(platform?: string): string | null {
  return (platform && PLATFORM_NAMES[platform]) ?? null;
}

export async function openExternalLink(url: string): Promise<void> {
  if (!url) return;
  if (window.cry?.openExternal) {
    await window.cry.openExternal(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** A browser hands a mailto: link to its own mail app; the desktop app's window may not navigate to one, so main opens it. */
export async function openEmailDraft(url: string): Promise<void> {
  if (window.cry) return openExternalLink(url);
  window.location.href = url;
}
