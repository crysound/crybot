import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

export function recordOpenCodeProviderEnvironment(argv: string[], env: NodeJS.ProcessEnv, pid: number): string | undefined {
  if (argv[2] !== "acp" || !env.FAKE_ACP_DUMP) return undefined;
  // PID namespaces can give separate boxed processes the same PID.
  const startId = randomUUID();
  writeFileSync(`${env.FAKE_ACP_DUMP}.${startId}.provider-env.json`, JSON.stringify({
    startId,
    pid,
    env: {
      ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
      ANTHROPIC_BASE_URL: env.ANTHROPIC_BASE_URL,
      VENICE_API_KEY: env.VENICE_API_KEY,
      OPENAI_API_KEY: env.OPENAI_API_KEY,
    },
  }), { flag: "wx" });
  return startId;
}
