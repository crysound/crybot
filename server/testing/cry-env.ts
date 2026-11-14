// A shell exporting CRYBOT_* / CRYBOT_* leaks them into every child and import-time env snapshot.

const AMBIENT_PREFIXES = ["CRYBOT_", "CRYBOT_"] as const;

export function isAmbientCryKey(key: string): boolean {
  return AMBIENT_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function stripCryEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const clean: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (!isAmbientCryKey(key)) clean[key] = value;
  }
  return clean;
}

export function childEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { ...stripCryEnv(process.env), ...overrides };
}
