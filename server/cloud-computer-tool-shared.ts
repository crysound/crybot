import type { ValidateFunction } from "ajv";
import { isRedditAddress, REDDIT_REFUSAL } from "./browser/egress/reddit.ts";
import { COMPUTER_COPY_BUDGET_MS, HARNESS_CALL_BUDGET_MS } from "./harness-budget.ts";
import { compileToolSchema } from "./mcp-schema-validator.ts";

const coordinate = { type: "integer", minimum: 0, maximum: 32767 };
const tool = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) =>
  ({ name, description, inputSchema: { type: "object", properties, required, additionalProperties: false } });
export const CLOUD_COMPUTER_TOOLS = [
  tool("screenshot", "See the assigned cloud desktop at native pixel resolution."),
  tool("get_screen_size", "Get the cloud desktop width and height."),
  tool("click", "Click a point on the cloud desktop.", { x: coordinate, y: coordinate, button: { type: "string", enum: ["left", "middle", "right"] }, count: { type: "integer", minimum: 1, maximum: 3 } }, ["x", "y"]),
  tool("move", "Move the cloud mouse pointer.", { x: coordinate, y: coordinate }, ["x", "y"]),
  tool("drag", "Drag on the cloud desktop.", { x: coordinate, y: coordinate, to_x: coordinate, to_y: coordinate }, ["x", "y", "to_x", "to_y"]),
  tool("type_text", "Type Unicode text into the focused cloud application.", { text: { type: "string", maxLength: 4000 } }, ["text"]),
  tool("key_press", "Press an X11 key or shortcut.", { key: { type: "string", pattern: "^[A-Za-z0-9_+]+$", minLength: 1, maxLength: 100 } }, ["key"]),
  tool("scroll", "Scroll at a point on the cloud desktop.", { x: coordinate, y: coordinate, direction: { type: "string", enum: ["up", "down", "left", "right"] }, amount: { type: "integer", minimum: 1, maximum: 30 } }, ["x", "y", "direction"]),
  tool("open_url", "Request opening an HTTP or HTTPS URL in the cloud desktop browser; inspect the screen to confirm it loaded.", { url: { type: "string", pattern: "^https?://", maxLength: 2000 } }, ["url"]),
  tool("exec", "Run a shell command on the assigned cloud computer and wait for its result. For a command that may run long (downloads, installs, builds, data jobs), set background: true: it starts the command and answers at once with a process_id to follow with exec_status, and the computer stays on for it for up to two hours. Completion does not automatically resume this turn or notify a delegator. If the result is needed for this task, use exec_status with wait_seconds in this turn until it finishes, then check its exit code and output. If you cannot finish checking in this turn, report the work as unfinished with the process_id; do not claim completion or start another copy blindly.", {
    command: { type: "string", minLength: 1, maxLength: 4000 },
    background: { type: "boolean", description: "Start the command and answer at once with a process_id, instead of waiting for it to finish." },
  }, ["command"]),
  tool("exec_status", `Check a command started with exec and background: true: running or finished, its exit code, and the end of its stdout and stderr (the last ${(4_000).toLocaleString("en-US")} and ${(2_000).toLocaleString("en-US")} characters).`, {
    process_id: { type: "string", pattern: "^bg-([1-9][0-9]{0,15})-([0-9a-f]{8})$" },
    wait_seconds: { type: "integer", minimum: 0, maximum: 60, description: "Wait up to this many seconds for the command to finish before answering. A running result can arrive before the full interval because the last status read needs time to respond." },
  }, ["process_id"]),
  tool("copy_from_computer", "Copy one file of up to 2 GiB from the cloud computer into your working folder, for example to load it with data_load or use it in a page. A file already there is replaced.", {
    path: { type: "string", minLength: 1, maxLength: 4096, description: "The file on the cloud computer, under /home/user or /tmp." },
    to: { type: "string", minLength: 1, maxLength: 1000, description: "Where it goes, relative to your working folder. Default: the file's own name." },
  }, ["path"]),
  tool("copy_to_computer", "Copy one file of up to 2 GiB from your working folder to the cloud computer. A file already there is replaced.", {
    from: { type: "string", minLength: 1, maxLength: 1000, description: "The file, relative to your working folder." },
    path: { type: "string", minLength: 1, maxLength: 4096, description: "Where it goes on the cloud computer, under /home/user or /tmp." },
  }, ["from", "path"]),
];

export const CLOUD_COMPUTER_NOT_READY = "The cloud computer is not ready. This call was not performed. Take a fresh screenshot in a moment.";
export const CLOUD_COMPUTER_LATE = "The cloud computer did not answer in time. This call may still have run; take a fresh screenshot before repeating it.";
export const CLOUD_COMPUTER_COPY_LATE = "The copy did not finish within 9 minutes and was stopped; nothing was changed. Make the file smaller on the cloud computer first (filter, compress or split it), then copy the parts.";
export const COPY_TOOLS = new Set(["copy_from_computer", "copy_to_computer"]);
export const cloudComputerCallBudgetMs = (name: unknown): number =>
  typeof name === "string" && COPY_TOOLS.has(name) ? COMPUTER_COPY_BUDGET_MS : HARNESS_CALL_BUDGET_MS;
export const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";
const buttons: Record<string, number> = { left: 1, middle: 2, right: 3 };
const scrollButtons: Record<string, number> = { up: 4, down: 5, left: 6, right: 7 };

export const CLOUD_COMPUTER_NO_FOLDER = "This turn has no working folder to copy into or out of.";
export const CLOUD_COMPUTER_BROWSER_REQUESTED = "Browser launch requested. Page loading is not confirmed; inspect the screen before continuing.";

export function cloudComputerDesktopCommand(name: string, a: Record<string, unknown>): string | undefined {
  const mouse = `xdotool mousemove --sync ${a.x} ${a.y}`;
  switch (name) {
    case "get_screen_size": return "xdotool getdisplaygeometry";
    case "click": return `${mouse} click --repeat ${a.count ?? 1} --delay 100 ${buttons[String(a.button ?? "left")]}`;
    case "move": return mouse;
    case "drag": return `${mouse} mousedown 1 mousemove --sync ${a.to_x} ${a.to_y} mouseup 1`;
    case "type_text": return `printf %s ${quote(Buffer.from(String(a.text)).toString("base64"))} | base64 -d | xclip -selection clipboard && xdotool key --clearmodifiers ctrl+v`;
    case "key_press": return `xdotool key --clearmodifiers ${quote(String(a.key))}`;
    case "scroll": return `${mouse} click --repeat ${a.amount ?? 3} --delay 80 ${scrollButtons[String(a.direction)]}`;
    case "open_url": return `nohup xdg-open ${quote(String(a.url))} >/dev/null 2>&1 </dev/null &`;
    default: return undefined;
  }
}

let validators: Map<string, ValidateFunction> | undefined;
export function cloudComputerCallProblem(name: unknown, args: unknown): string | null {
  validators ??= new Map(CLOUD_COMPUTER_TOOLS.map(entry => [entry.name, compileToolSchema(entry.inputSchema)]));
  const validate = typeof name === "string" ? validators.get(name) : undefined;
  if (!validate) return "Unknown cloud computer tool. Use one of the advertised computer tools.";
  if (!args || typeof args !== "object" || Array.isArray(args) || !validate(args)) return "Tool arguments do not match the advertised input schema; use its required fields and types.";
  if (name === "open_url" && isRedditAddress(String((args as { url: unknown }).url))) return REDDIT_REFUSAL;
  return null;
}

export type CloudComputerResult = {
  content: Array<{ type: "text"; text: string } | { type: "image"; mimeType: string; data: string }>;
  isError?: boolean;
};
