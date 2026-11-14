import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { removeTempDir } from "./cleanup.ts";
import { ownTurnText, runRoomHandoffAgent } from "./room-handoff-agent.ts";

async function withMcp(script: string, test: (run: () => Promise<string>, dir: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "cry-handoff-process-"));
  const config = join(dir, "mcp.json");
  const prompt = join(dir, "system.txt");
  const plan = join(dir, "plan.json");
  writeFileSync(config, JSON.stringify({ mcpServers: { agents: {
    command: process.execPath, args: ["-e", script], env: { CRYBOT_BOT_ID: "fixture", FIXTURE_HOME: dir },
  } } }));
  writeFileSync(prompt, "Only this disposable test fixture.");
  writeFileSync(plan, JSON.stringify({ fixture: { reply: "Completed fixture" } }));
  try { await test(() => runRoomHandoffAgent(["--mcp-config", config, "--append-system-prompt-file", prompt], plan), dir); }
  finally { await removeTempDir(dir); }
}

it("rejects malformed MCP output rather than crashing the provider process", () => withMcp(
  'process.stdout.write("not json\\n"); setInterval(() => {}, 1000);',
  async run => { await expect(run()).rejects.toThrow("Fixture MCP returned malformed JSON"); },
));

it("rejects an unexpected MCP exit without waiting for a pending call to time out", () => withMcp(
  'process.stdin.once("data", () => process.exit(7));',
  async run => { await expect(run()).rejects.toThrow("Fixture MCP exited unexpectedly: 7"); },
));

it("reaps the MCP process even if it ignores graceful shutdown", () => withMcp(`
  require("node:fs").writeFileSync(require("node:path").join(process.env.FIXTURE_HOME, "pid"), String(process.pid));
  process.on("SIGTERM", () => {});
  setInterval(() => {}, 1000);
  require("node:readline").createInterface({ input: process.stdin }).on("line", line => {
    const request = JSON.parse(line);
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: {} }) + "\\n");
  });
`, async (run, dir) => {
  await expect(run()).resolves.toBe("Completed fixture");
  const pid = Number(readFileSync(join(dir, "pid"), "utf8"));
  expect(() => process.kill(pid, 0)).toThrow();
}));

// Answers every request, as an agents server that has nothing to say does.
const RESPONDER = `require("node:readline").createInterface({ input: process.stdin }).on("line", line => {
  const request = JSON.parse(line);
  require("node:fs").appendFileSync(require("node:path").join(process.env.FIXTURE_HOME, "requests.jsonl"), line + "\\n");
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: {} }) + "\\n");
});`;

const stepCalls = (dir: string): string[] => {
  const path = join(dir, "requests.jsonl");
  return existsSync(path) ? readFileSync(path, "utf8").trim().split("\n").map(line => JSON.parse(line))
    .filter(request => request.method === "tools/call" && request.params.name === "coordinate_bots")
    .map(request => request.params.arguments.message) : [];
};

it("sends a step only after its waitForFile exists, including a file already present", () => withMcp(RESPONDER, async (run, dir) => {
  const ready = join(dir, "ready");
  writeFileSync(join(dir, "plan.json"), JSON.stringify({ fixture: { steps: [
    { arguments: { message: "first" } },
    { waitForFile: ready, arguments: { message: "second" } },
    { waitForFile: ready, arguments: { message: "third" } },
  ], reply: "Completed fixture" } }));
  const result = run().catch((error: unknown) => error);
  try {
    await expect.poll(() => stepCalls(dir), { timeout: 10_000 }).toEqual(["first"]);
  } finally {
    writeFileSync(ready, "ready");
    await expect(result).resolves.toBe("Completed fixture");
  }
  expect(stepCalls(dir)).toEqual(["first", "second", "third"]);
}));

it("times out a missing waitForFile without sending the blocked step", () => withMcp(RESPONDER, async (run, dir) => {
  writeFileSync(join(dir, "plan.json"), JSON.stringify({ fixture: { timeoutMs: 3_000, steps: [
    { arguments: { message: "first" } },
    { waitForFile: join(dir, "missing"), arguments: { message: "second" } },
  ] } }));
  await expect(run()).rejects.toThrow("Fixture MCP run timed out");
  expect(stepCalls(dir)).toEqual(["first"]);
}), 10_000);

it("keeps turn counters in writable evidence without writing beside the input plan", () => withMcp(RESPONDER, async (run, dir) => {
  const evidence = join(dir, "turns.jsonl");
  const plan = join(dir, "plan.json");
  const input = readFileSync(plan, "utf8");
  vi.stubEnv("FAKE_CLAUDE_ROOM_EVIDENCE", evidence);
  try {
    await expect(run()).resolves.toBe("Completed fixture");
    await expect(run()).resolves.toBe("Completed fixture");
    expect(readFileSync(evidence, "utf8").trim().split("\n").map((line) => JSON.parse(line).turnIndex)).toEqual([0, 1]);
    expect(readFileSync(plan, "utf8")).toBe(input);
    expect(existsSync(`${plan}.evidence.jsonl`)).toBe(false);
  } finally {
    vi.unstubAllEnvs();
  }
}));

it("reads a turn's own words: a replayed history and recalled passages are not the turn's", () => {
  const replayed = "[This conversation received an update outside your provider session. The complete current history follows so you can use that update in your next response:]\n\nUser: OTHER-JOB\n\n[Now reply to the user's latest message:]\n\nTHIS-JOB";
  expect(ownTurnText({ message: { content: replayed } })).toBe("\n\nTHIS-JOB");
  const recalled = "Recalled for this message — passages from your own memory files and earlier conversations: OTHER-JOB\n[end of recalled passages — the message follows]\nTHIS-JOB";
  expect(ownTurnText({ message: { content: [{ type: "text", text: recalled }] } })).toBe("\nTHIS-JOB");
});

it("runs the script entry a turn was itself asked for, a one-shot entry once, and refuses a turn nobody scripted", () => withMcp(RESPONDER, async (_run, dir) => {
  const plan = join(dir, "plan.json");
  writeFileSync(plan, JSON.stringify({ fixture: { script: [
    { key: "loop", repeat: true, match: ["LOOP"], reply: "looped" },
    { key: "job", match: ["JOB"], reply: "job done" },
  ] } }));
  const turn = (text: string) => runRoomHandoffAgent(["--mcp-config", join(dir, "mcp.json"), "--append-system-prompt-file", join(dir, "system.txt")], plan, { message: { content: text } });
  await expect(turn("User: JOB\n\n[Now reply to the user's latest message:]\n\nLOOP")).resolves.toBe("looped");
  await expect(turn("JOB: build it")).resolves.toBe("job done");
  await expect(turn("JOB: build it")).rejects.toThrow("Unplanned fixture turn for fixture: JOB: build it");
  await expect(turn("LOOP")).resolves.toBe("looped");
  const evidence = readFileSync(`${plan}.evidence.jsonl`, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  expect(evidence.map((record) => record.planKey ?? (record.unplanned ? "unplanned" : null))).toEqual(["loop", "job", "unplanned", "loop"]);
}));
