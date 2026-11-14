import type { InstanceConfig } from "./contracts.ts";

export function isClaudeEndpoint(entry: InstanceConfig | undefined): boolean {
  const config = entry?.config as { endpointModels?: unknown; bedrock?: unknown } | undefined;
  return entry?.driver === "claudeAgent" && Array.isArray(config?.endpointModels) && config?.bedrock !== true;
}
