import { pathToFileURL } from "node:url";
import { CONTAINER, cuaExecArgs, screenExecArgs, sharedScreenTarget } from "./container-computer.ts";
import { runMcpBridge } from "./mcp-bridge.ts";

export function containerMcpExecArgs(argv: string[]): { runtime: string; args: string[] } {
  const [runtime, container, socket, user, display] = argv;
  if (!runtime || !["docker", "podman", "container"].includes(runtime)) throw new Error("invalid Local VM runtime");
  const sharedSocket = socket === "/run/user/1000/crybot-cua.sock";
  const screenMatch = socket?.match(/^\/run\/user\/6100([1-4])\/crybot-cua\.sock$/);
  const screen = screenMatch ? Number(screenMatch[1]) : null;
  const validScreenIdentity = screen !== null && container === CONTAINER && user === `crybot-s${screen}` && display === `:${screen}`;
  if (!container || !/^[a-zA-Z0-9_.-]+$/.test(container) || (!sharedSocket && !validScreenIdentity) ||
    (sharedSocket && (user !== undefined || display !== undefined))) throw new Error("invalid Local VM connection");
  return {
    runtime,
    args: screen === null
      ? cuaExecArgs(["mcp", "--socket", socket!], { container, interactive: true })
      : screenExecArgs(sharedScreenTarget(screen), ["mcp", "--socket", socket!], { interactive: true }),
  };
}

async function main(): Promise<void> {
  let connection: ReturnType<typeof containerMcpExecArgs>;
  try {
    connection = containerMcpExecArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exitCode = 2;
    return;
  }
  const { runtime, args } = connection;
  // The control token stays in env because argv is visible to other processes.
  const controlUrl = process.env.CRYBOT_CONTROL_URL ?? "";
  const controlToken = process.env.CRYBOT_CONTROL_TOKEN ?? "";
  if (process.env.CRYBOT_CONTAINER_LAZY === "1" && controlUrl && controlToken) {
    const { runLazyContainerMcp } = await import("./lazy-container-mcp.ts");
    runLazyContainerMcp(runtime, args, { url: controlUrl, token: controlToken });
  } else {
    runMcpBridge({
      command: runtime,
      args,
      label: "Cua Driver",
      ...(controlUrl && controlToken ? { gate: { url: controlUrl, token: controlToken } } : {}),
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
