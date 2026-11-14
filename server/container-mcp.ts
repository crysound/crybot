import { cuaExecArgs } from "./container-computer.ts";
import { runMcpBridge } from "./mcp-bridge.ts";

const [runtime, container, socket] = process.argv.slice(2);
if (!runtime || !["docker", "podman", "container"].includes(runtime)) {
  process.stderr.write("invalid Local VM runtime\n");
  process.exit(2);
}
if (!container || !/^[a-zA-Z0-9_.-]+$/.test(container) || !socket?.startsWith("/run/user/1000/")) {
  process.stderr.write("invalid Local VM connection\n");
  process.exit(2);
}

// The who-is-driving pair rides in env, not argv, which `ps` shows to everyone; the token guards a loopback endpoint.
const controlUrl = process.env.CRYBOT_CONTROL_URL ?? "";
const controlToken = process.env.CRYBOT_CONTROL_TOKEN ?? "";

if (process.env.CRYBOT_CONTAINER_LAZY === "1" && controlUrl && controlToken) {
  const { runLazyContainerMcp } = await import("./lazy-container-mcp.ts");
  runLazyContainerMcp(runtime, cuaExecArgs(["mcp", "--socket", socket], { container, interactive: true }), { url: controlUrl, token: controlToken });
} else {
  runMcpBridge({
    command: runtime,
    args: cuaExecArgs(["mcp", "--socket", socket], { container, interactive: true }),
    label: "Cua Driver",
    // No liveness watchdog: the runtime CLI talks to a local daemon and fails fast on its own.
    ...(controlUrl && controlToken ? { gate: { url: controlUrl, token: controlToken } } : {}),
  });
}
