// Served at POST /api/internal/computer/mcp behind a turn-scoped capability, so the Boat credential never leaves this server.
import type { InstaboxMachines, InstaboxRequest } from "./instabox/machine.ts";
import { runInstaboxComputerTool } from "./instabox/computer-tools.ts";
import { isolatedRemoteCommand, runCommand, screenshotBoat } from "./boat.ts";
import {
  backgroundStatus, commandLateText, EXEC_LATE, startInBackground,
} from "./cloud-computer-background.ts";
import { copyFromComputer, copyToComputer } from "./cloud-computer-files.ts";
import type { AppConfig } from "./config.ts";
import { controlRefusal, type ControlState } from "./computer-control-client.ts";
import { CLOUD_COMPUTER_NO_ANSWER } from "../shared/cloud-computer-recovery.ts";

import { CLOUD_COMPUTER_BROWSER_REQUESTED, CLOUD_COMPUTER_COPY_LATE, CLOUD_COMPUTER_LATE, CLOUD_COMPUTER_NO_FOLDER, CLOUD_COMPUTER_NOT_READY, CLOUD_COMPUTER_TOOLS, COPY_TOOLS, cloudComputerCallBudgetMs, cloudComputerCallProblem, cloudComputerDesktopCommand, type CloudComputerResult } from "./cloud-computer-tool-shared.ts";
export { CLOUD_COMPUTER_BROWSER_REQUESTED, CLOUD_COMPUTER_COPY_LATE, CLOUD_COMPUTER_LATE, CLOUD_COMPUTER_NO_FOLDER, CLOUD_COMPUTER_NOT_READY, CLOUD_COMPUTER_TOOLS, COPY_TOOLS, cloudComputerCallBudgetMs, cloudComputerCallProblem, cloudComputerDesktopCommand, quote } from "./cloud-computer-tool-shared.ts";
export type { CloudComputerResult } from "./cloud-computer-tool-shared.ts";

/** The caller has already checked the arguments and the person's control. `folder` is the bot's working folder for this turn. */
export async function runCloudComputerTool(
  cfg: AppConfig,
  boxId: string,
  name: string,
  args: Record<string, unknown>,
  signal: AbortSignal,
  folder?: string | null,
): Promise<CloudComputerResult> {
  const problem = cloudComputerCallProblem(name, args);
  if (problem) return { isError: true, content: [{ type: "text", text: problem }] };
  signal.throwIfAborted();
  if (COPY_TOOLS.has(name)) {
    if (!folder) return { isError: true, content: [{ type: "text", text: CLOUD_COMPUTER_NO_FOLDER }] };
    const copied = name === "copy_from_computer"
      ? await copyFromComputer(cfg, boxId, folder, args as { path: string; to?: string }, signal)
      : await copyToComputer(cfg, boxId, folder, args as { from: string; path: string }, signal);
    return "error" in copied ? { isError: true, content: [{ type: "text", text: copied.error }] } : { content: [{ type: "text", text: JSON.stringify(copied) }] };
  }
  if (name === "screenshot") {
    const shot = await screenshotBoat(cfg, "", boxId, { signal, nativeSize: true });
    signal.throwIfAborted();
    return { content: [{ type: "image", mimeType: "image/jpeg", data: shot.png }] };
  }
  if (name === "exec" && args.background === true) return startInBackground(cfg, boxId, String(args.command), signal);
  if (name === "exec_status") return backgroundStatus(cfg, boxId, args as { process_id: string; wait_seconds?: number }, signal);
  const command = name === "exec" ? String(args.command) : cloudComputerDesktopCommand(name, args)!;
  const result = await runCommand(cfg, boxId, isolatedRemoteCommand(command), { signal });
  signal.throwIfAborted();
  if (name === "open_url" && result.ok) return { content: [{ type: "text", text: CLOUD_COMPUTER_BROWSER_REQUESTED }] };
  if (name === "exec" && result.timedOut) return { isError: true, content: [{ type: "text", text: EXEC_LATE }] };
  if (result.unanswered) return { isError: true, content: [{ type: "text", text: CLOUD_COMPUTER_NO_ANSWER }] };
  return { isError: !result.ok, content: [{ type: "text", text: JSON.stringify(result) }] };
}

/** The order is the safety argument: arguments, then the control gate (which may create or wake the Boat), then the Boat
 * read; the turn's capability must be live before and after the Boat acts. Listing touches no Boat. */
export async function cloudComputerRpc(
  request: { method?: unknown; params?: unknown } | null | undefined,
  deps: {
    cfg: AppConfig;
    instabox?: { machines: InstaboxMachines; machineId(): string | null | undefined; request?: InstaboxRequest };
    /** The Boat this call acts on, read after the gate. */
    boxId(): string | null | undefined;
    /** The bot's working folder, which the copy tools read from and write into. */
    folder?(): string | null | undefined;
    gate(): Promise<Pick<ControlState, "held" | "reason" | "blockedReason">>;
    assertActive(): void;
    signal: AbortSignal;
    /** The whole call, the gate's wait included, answers within this. */
    budgetMs?: number;
    /** A computer that stopped answering (server/boat-recovery.ts): what the bot is told instead, and once after it was replaced. */
    recovery?: { refusal(boxId: string, phase: "before" | "after"): string | null; notice(boxId: string): string | null };
  },
): Promise<{ tools: typeof CLOUD_COMPUTER_TOOLS } | CloudComputerResult> {
  const started = Date.now();
  if (request?.method === "tools/list") {
    deps.assertActive();
    return { tools: CLOUD_COMPUTER_TOOLS };
  }
  if (request?.method !== "tools/call") throw Object.assign(new Error("unsupported computer method"), { status: 400 });
  const params = (request.params && typeof request.params === "object" ? request.params : {}) as { name?: unknown; arguments?: unknown };
  const args = params.arguments ?? {};
  const copy = typeof params.name === "string" && COPY_TOOLS.has(params.name);
  const deadline = started + (deps.budgetMs ?? cloudComputerCallBudgetMs(params.name));
  const problem = cloudComputerCallProblem(params.name, args);
  if (problem) return { isError: true, content: [{ type: "text", text: problem }] };
  const control = await deps.gate();
  // A refusal acts on no Boat, so it answers even when the turn has ended meanwhile.
  if (control.held) return { isError: true, content: [{ type: "text", text: controlRefusal(control) }] };
  deps.assertActive();
  const boxId = deps.instabox ? deps.instabox.machineId() : deps.boxId();
  if (!boxId) return { isError: true, content: [{ type: "text", text: CLOUD_COMPUTER_NOT_READY }] };
  const refused = (phase: "before" | "after"): CloudComputerResult | null => {
    const text = !deps.instabox && deps.recovery?.refusal(boxId, phase);
    return text ? { isError: true, content: [{ type: "text", text }] } : null;
  };
  const before = refused("before");
  if (before) return before;
  const late = AbortSignal.timeout(Math.max(1, deadline - Date.now()));
  let result: CloudComputerResult;
  try {
    const signal = AbortSignal.any([deps.signal, late]);
    result = deps.instabox
      ? await runInstaboxComputerTool(deps.instabox.machines, boxId, params.name as string, args as Record<string, unknown>, signal, deps.folder?.(), deps.instabox.request)
      : await runCloudComputerTool(deps.cfg, boxId, params.name as string, args as Record<string, unknown>, signal, deps.folder?.());
  } catch (error) {
    if (deps.signal.aborted) throw error;
    const after = refused("after");
    if (after) return after;
    if (!late.aborted) throw error;
    return { isError: true, content: [{ type: "text", text: commandLateText(params.name, args) ?? (copy ? CLOUD_COMPUTER_COPY_LATE : CLOUD_COMPUTER_LATE) }] };
  }
  deps.assertActive();
  const unanswered = result.isError && result.content.some((part) => part.type === "text" && part.text === CLOUD_COMPUTER_NO_ANSWER);
  if (unanswered) result = refused("after") ?? result;
  const notice = !deps.instabox && deps.recovery?.notice(boxId);
  return notice ? { ...result, content: [{ type: "text", text: notice }, ...result.content] } : result;
}
