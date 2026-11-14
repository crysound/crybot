import type { SendTurnInput } from "../contracts.ts";
import { cleanFeishuEnvironment } from "../feishu-cli/turn.ts";
import type { KeepWarmContract } from "./claude-keepwarm.ts";
import { promptHalves } from "./prompt-split.ts";

export async function claudeTurnLaunch(turn: SendTurnInput, env: NodeJS.ProcessEnv) {
  const halves = promptHalves(turn);
  const feishuEnvironment = turn.feishuCli ? await turn.feishuCli.environment() : undefined;
  const launchSystem = [halves.stable ?? turn.system, turn.feishuCli?.prompt()].filter(Boolean).join("\n\n");
  return {
    halves,
    launchSystem,
    environment: () => ({ ...cleanFeishuEnvironment(env), ...feishuEnvironment }),
    rememberWarmContract(
      contracts: Map<string, KeepWarmContract>, threadId: string,
      args: string[], cwd: string, mcpServers: Record<string, unknown> | null, settings: Record<string, unknown> | null,
    ) {
      if (turn.guestConfined || turn.feishuCli) contracts.delete(threadId);
      else {
        contracts.set(threadId, {
          args: [...args], env: { ...env }, cwd, system: launchSystem ?? null,
          mcpServers: mcpServers ? JSON.parse(JSON.stringify(mcpServers)) : null,
          settings: settings ? JSON.parse(JSON.stringify(settings)) : null,
        });
      }
    },
  };
}
