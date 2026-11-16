import { randomBytes, randomUUID } from "node:crypto";
import { constants, renameSync, rmSync } from "node:fs";
import { open } from "node:fs/promises";
import { basename, join, posix, relative } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { isolatedRemoteCommand } from "../boat.ts";
import {
  BACKGROUND_NEXT, OTHER_COMPUTER, POLL_MS, UNKNOWN_PROCESS,
  commandLateText, describeStatus, processIdOn, statusError, STDOUT_TAIL_CHARS, STDERR_TAIL_CHARS,
} from "../cloud-computer-background.ts";
import {
  DISK_RESERVE_BYTES, MiB, diskFree, land, noFollow, noSpace, placeInFolder,
  type CopyOutcome,
} from "../cloud-computer-files.ts";
import {
  cloudComputerCallBudgetMs, cloudComputerCallProblem, cloudComputerDesktopCommand,
  CLOUD_COMPUTER_BROWSER_REQUESTED, CLOUD_COMPUTER_LATE, CLOUD_COMPUTER_NO_FOLDER, quote,
  type CloudComputerResult,
} from "../cloud-computer-tool-shared.ts";
import type { InstaboxExecResult, InstaboxMachines, InstaboxRequest } from "./machine.ts";

const text = (value: string, isError = false): CloudComputerResult => ({ ...(isError ? { isError } : {}), content: [{ type: "text", text: value }] });
export const INSTABOX_HOME = "/home/user";
export const INSTABOX_PATH_REFUSAL = "Path must be under /home/user or /tmp.";
const INSTABOX_COPY_MAX_BYTES = 256 * MiB;
const INSTABOX_SCREENSHOT_MAX_BYTES = 16 * MiB;
let activeCopies = 0;
const BACKGROUND_MAX_MS = 2 * 60 * 60_000;
const ACTIVITY_LEASE_TTL_SECONDS = 3600;
const resultText = (result: InstaboxExecResult): CloudComputerResult => text(JSON.stringify({
  ok: result.exitCode === 0 && !result.timedOut, ...result,
}), result.exitCode !== 0 || result.timedOut);

// The shared machines contract has no signal; a late API answer must never commit a local copy or continue a tool.
async function abortable<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
  signal.throwIfAborted();
  let aborted: (() => void) | undefined;
  try {
    return await Promise.race([work(), new Promise<never>((_resolve, reject) => {
      aborted = () => reject(signal.reason);
      signal.addEventListener("abort", aborted, { once: true });
      if (signal.aborted) aborted();
    })]);
  } finally {
    if (aborted) signal.removeEventListener("abort", aborted);
  }
}

type Exec = (command: string, signal?: AbortSignal) => Promise<InstaboxExecResult>;

async function remotePath(exec: Exec, path: string): Promise<string | CloudComputerResult> {
  const absolute = posix.isAbsolute(path) ? path : posix.join(INSTABOX_HOME, path);
  const result = await exec(`p=$(realpath -m -- ${quote(absolute)}) && case "$p" in ${INSTABOX_HOME}|${INSTABOX_HOME}/*|/tmp|/tmp/*) printf %s "$p";; *) printf %s ${quote(INSTABOX_PATH_REFUSAL)} >&2; exit 77;; esac`);
  if (result.exitCode === 77 && !result.timedOut) return text(INSTABOX_PATH_REFUSAL, true);
  return result.exitCode === 0 && !result.timedOut ? result.stdout : resultText(result);
}

async function copyFile(
  machines: InstaboxMachines, machineId: string, exec: Exec, name: string,
  args: Record<string, unknown>, folder: string, signal: AbortSignal,
): Promise<CloudComputerResult> {
  const fromComputer = name === "copy_from_computer";
  const wanted = fromComputer ? String(args.to ?? posix.basename(String(args.path))) : String(args.from);
  if (!wanted) return text("Name the file to copy, or say where it goes with to.", true);
  const placed = placeInFolder(folder, wanted);
  if ("error" in placed) return text(placed.error, true);
  let copied: CopyOutcome;
  if (fromComputer) {
    const remote = await remotePath(exec, String(args.path));
    if (typeof remote !== "string") return remote;
    const size = await exec(`stat -Lc %s -- ${quote(remote)}`);
    if (size.exitCode !== 0 || size.timedOut) return resultText(size);
    const declared = Number(size.stdout.trim());
    if (!Number.isSafeInteger(declared) || declared < 0) return resultText({ ...size, exitCode: 1 });
    if (declared > INSTABOX_COPY_MAX_BYTES) return text(`${remote} is ${(declared / MiB).toFixed(1)} MiB; a copy moves at most 256 MiB. Make it smaller on the cloud computer first (filter, compress or split it), then copy the parts.`, true);
    const free = diskFree(placed.root);
    if (declared + DISK_RESERVE_BYTES > free) return text(noSpace(remote, declared, free), true);
    const data = await machines.readFile(machineId, remote, { maxBytes: INSTABOX_COPY_MAX_BYTES });
    signal.throwIfAborted();
    if (data.byteLength > INSTABOX_COPY_MAX_BYTES) return text(`${remote} is ${(data.byteLength / MiB).toFixed(1)} MiB; a copy moves at most 256 MiB. Make it smaller on the cloud computer first (filter, compress or split it), then copy the parts.`, true);
    if (data.byteLength + DISK_RESERVE_BYTES > free) return text(noSpace(remote, data.byteLength, free), true);
    const landed = land(placed, wanted);
    if ("error" in landed) return text(landed.error, true);
    const temporary = join(landed.parent, `.${basename(landed.target)}.${randomBytes(6).toString("hex")}.part`);
    const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow, 0o644);
    try {
      await handle.writeFile(data);
      await handle.close();
      signal.throwIfAborted();
      renameSync(temporary, landed.target);
    } finally {
      await handle.close().catch(() => {});
      rmSync(temporary, { force: true });
    }
    copied = { path: relative(placed.root, landed.target), bytes: data.byteLength };
  } else {
    let handle;
    try { handle = await open(placed.file, constants.O_RDONLY | noFollow); } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return text(`${wanted} is not in your working folder.`, true);
      if (code === "ELOOP") return text(`${wanted} leads outside your working folder.`, true);
      throw error;
    }
    try {
      const info = await handle.stat();
      if (!info.isFile()) return text(`${wanted} is not a file.`, true);
      if (info.size > INSTABOX_COPY_MAX_BYTES) return text(`${wanted} is ${(info.size / MiB).toFixed(1)} MiB; a copy moves at most 256 MiB. Make it smaller on the cloud computer first (filter, compress or split it), then copy the parts.`, true);
      const data = Buffer.alloc(info.size);
      let offset = 0;
      while (offset < data.byteLength) {
        signal.throwIfAborted();
        const { bytesRead } = await handle.read(data, offset, data.byteLength - offset, offset);
        if (!bytesRead) return text(`The upload of ${wanted} was interrupted; the cloud computer still has its old file, if any. Try again.`, true);
        offset += bytesRead;
      }
      const remote = await remotePath(exec, String(args.path));
      if (typeof remote !== "string") return remote;
      await machines.writeFile(machineId, remote, data, { mode: "0644" });
      signal.throwIfAborted();
      copied = { path: remote, bytes: data.byteLength };
    } finally { await handle.close(); }
  }
  return text(JSON.stringify(copied));
}

const BACKGROUND_ROOT = "/tmp/cry-instabox-background";
type ActivityLease = {
  request: InstaboxRequest; machineId: string; id: string; processes: Set<string>;
  pending: Promise<void>; renew?: ReturnType<typeof setInterval>; expiry?: ReturnType<typeof setTimeout>;
};
const activityLeases = new Map<string, ActivityLease>();

const activityLeasePath = (lease: ActivityLease) => `/v1/machines/${lease.machineId}/activity-leases/${encodeURIComponent(lease.id)}`;

async function putActivityLease(lease: ActivityLease): Promise<void> {
  const response = await lease.request("PUT", activityLeasePath(lease), { body: { ttlSeconds: ACTIVITY_LEASE_TTL_SECONDS } });
  await response.body?.cancel();
  if (!response.ok) throw new Error("Activity lease rejected");
}

async function releaseActivityLease(machineId: string, processId?: string): Promise<void> {
  const lease = activityLeases.get(machineId);
  if (!lease) return;
  if (processId) lease.processes.delete(processId);
  else lease.processes.clear();
  await lease.pending;
  if (lease.processes.size || activityLeases.get(machineId) !== lease) return;
  activityLeases.delete(machineId);
  clearInterval(lease.renew);
  clearTimeout(lease.expiry);
  await lease.request("DELETE", activityLeasePath(lease)).then(response => response.body?.cancel()).catch(() => {});
}

function renewActivityLease(lease: ActivityLease): Promise<void> {
  lease.pending = lease.pending.then(async () => {
    if (activityLeases.get(lease.machineId) === lease) await putActivityLease(lease);
  }).catch(() => {});
  return lease.pending;
}

async function acquireActivityLease(request: InstaboxRequest | undefined, machineId: string, processId: string): Promise<void> {
  if (!request) return;
  const existing = activityLeases.get(machineId);
  if (existing) {
    existing.processes.add(processId);
    existing.expiry?.refresh();
    await renewActivityLease(existing);
    return;
  }
  const lease: ActivityLease = { request, machineId, id: `crybot-${randomUUID()}`, processes: new Set([processId]), pending: Promise.resolve() };
  activityLeases.set(machineId, lease);
  lease.pending = (async () => {
    await putActivityLease(lease);
    lease.renew = setInterval(() => { void renewActivityLease(lease); }, 30 * 60_000);
    lease.expiry = setTimeout(() => { void releaseActivityLease(machineId); }, BACKGROUND_MAX_MS);
    lease.renew.unref?.(); lease.expiry.unref?.();
  })().catch(() => { activityLeases.delete(machineId); });
  await lease.pending;
}

async function startBackground(exec: Exec, machineId: string, command: string, request?: InstaboxRequest): Promise<CloudComputerResult> {
  const child = `/bin/bash -c ${quote(command)} >"$1/stdout" 2>"$1/stderr"; code=$?; printf '%s' "$code" >"$1/exit.tmp"; mv -- "$1/exit.tmp" "$1/exit"`;
  const started = await exec(`umask 077
mkdir -p -- ${quote(BACKGROUND_ROOT)} || exit
job=$(mktemp -d ${quote(BACKGROUND_ROOT + "/job.XXXXXXXXXXXX")}) || exit
nohup setsid --wait /bin/bash -c ${quote(child)} bash "$job" >"$job/log" 2>&1 </dev/null &
pid=$!
awk '{print $22}' "/proc/$pid/stat" >"$job/start" 2>/dev/null
ln -sfn -- "$job" ${quote(BACKGROUND_ROOT)}/"$pid" || exit
printf '%s' "$pid"`);
  if (started.timedOut) return text(commandLateText("exec", { background: true })!, true);
  if (started.exitCode !== 0) return resultText(started);
  const pid = Number(started.stdout.trim());
  if (!Number.isSafeInteger(pid) || pid < 1) return text(commandLateText("exec", { background: true })!, true);
  const processId = processIdOn(machineId, pid);
  await acquireActivityLease(request, machineId, processId);
  return text(JSON.stringify({ processId, status: "running", next: BACKGROUND_NEXT }));
}

type BackgroundRead = { running: boolean; status: string; exitCode: number | null; stdout: string; stderr: string; stdoutTruncated: boolean; stderrTruncated: boolean };

function logTail(encoded: string, chars: number): { value: string; cut: boolean } {
  const whole = Buffer.from(encoded, "base64").toString("utf8");
  const tail = whole.slice(-chars);
  const first = tail.charCodeAt(0);
  return { value: first >= 0xdc00 && first <= 0xdfff ? tail.slice(1) : tail, cut: whole.length > chars };
}

async function backgroundStatus(exec: Exec, machineId: string, args: { process_id: string; wait_seconds?: number }, signal: AbortSignal): Promise<CloudComputerResult> {
  const pid = Number(args.process_id.split("-")[1]);
  if (!Number.isSafeInteger(pid) || processIdOn(machineId, pid) !== args.process_id) return text(OTHER_COMPUTER, true);
  const waitMs = Math.min(args.wait_seconds ?? 0, 60) * 1_000;
  const until = Date.now() + waitMs;
  const lastReadWindow = Math.min(1_000, waitMs / 2);
  let last: { body: BackgroundRead; at: number } | undefined;
  let finalRead = false;
  for (;;) {
    signal.throwIfAborted();
    if (last && Date.now() >= until) return describeStatus(args.process_id, last.body, last.at);
    const deadline = waitMs && last ? AbortSignal.timeout(Math.max(1, until - Date.now())) : null;
    let result: InstaboxExecResult;
    try {
      result = await exec(`job=${quote(BACKGROUND_ROOT + "/" + pid)}
[ -d "$job" ] || exit 44
if [ -f "$job/exit" ]; then printf 'finished\\n'; cat "$job/exit"
elif kill -0 ${pid} 2>/dev/null && [ "$(awk '{print $22}' /proc/${pid}/stat 2>/dev/null)" = "$(cat "$job/start")" ] && [ "$(awk '{print $3}' /proc/${pid}/stat 2>/dev/null)" != Z ]; then printf 'running\\n'
else printf 'lost\\n'; fi
printf '\\n'
tail -c ${STDOUT_TAIL_CHARS * 3 + 4} "$job/stdout" 2>/dev/null | base64 -w0
printf '\\n'
tail -c ${STDERR_TAIL_CHARS * 3 + 4} "$job/stderr" 2>/dev/null | base64 -w0
printf '\\n'`, deadline ? AbortSignal.any([signal, deadline]) : signal);
    } catch (error) {
      signal.throwIfAborted();
      if (deadline?.aborted && last) return describeStatus(args.process_id, last.body, last.at);
      throw error;
    }
    if (result.timedOut) return text(commandLateText("exec_status", args)!, true);
    if (result.exitCode === 44) { const answer = statusError(UNKNOWN_PROCESS, args.process_id, last && { body: last.body, observedAt: last.at }); await releaseActivityLease(machineId, args.process_id); return answer; }
    if (result.exitCode !== 0) return resultText(result);
    const [status, code, out = "", err = ""] = result.stdout.split("\n");
    if (!["running", "finished", "lost"].includes(status)) return text(commandLateText("exec_status", args)!, true);
    const stdout = logTail(out, STDOUT_TAIL_CHARS), stderr = logTail(err, STDERR_TAIL_CHARS);
    const body: BackgroundRead = { running: status === "running", status, exitCode: status === "finished" && /^\d+$/.test(code) ? Number(code) : null,
      stdout: stdout.value, stderr: stderr.value, stdoutTruncated: stdout.cut, stderrTruncated: stderr.cut };
    last = { body, at: Date.now() };
    const remaining = until - last.at;
    if (!body.running || remaining <= 0 || finalRead) {
      const answer = describeStatus(args.process_id, body);
      if (!body.running) await releaseActivityLease(machineId, args.process_id);
      return answer;
    }
    const inLastWindow = remaining <= lastReadWindow;
    finalRead = inLastWindow;
    await delay(inLastWindow ? Math.max(1, Math.floor(remaining / 2)) : Math.min(POLL_MS, remaining - lastReadWindow), undefined, { signal });
    if (Date.now() >= until) return describeStatus(args.process_id, body, last.at);
  }
}

export async function runInstaboxComputerTool(
  machines: InstaboxMachines,
  machineId: string,
  name: string,
  args: Record<string, unknown>,
  signal: AbortSignal,
  folder?: string | null,
  request?: InstaboxRequest,
): Promise<CloudComputerResult> {
  const problem = cloudComputerCallProblem(name, args);
  if (problem) return text(problem, true);
  signal.throwIfAborted();
  const exec: Exec = (command, callSignal = signal) => abortable(callSignal, () => machines.exec(machineId, {
    cmd: isolatedRemoteCommand(command), envs: { DISPLAY: ":1" },
    timeoutSeconds: Math.min(600, Math.max(1, Math.ceil(cloudComputerCallBudgetMs(name) / 1000))),
  }));
  if (name === "copy_from_computer" || name === "copy_to_computer") {
    if (!folder) return text(CLOUD_COMPUTER_NO_FOLDER, true);
    if (activeCopies >= 2) return text("File copying is busy. Please try again later.", true);
    return abortable(signal, async () => {
      activeCopies++;
      try { return await copyFile(machines, machineId, exec, name, args, folder, signal); }
      finally { activeCopies--; }
    });
  }
  if (name === "screenshot") {
    const path = `/tmp/cry-instabox-${randomBytes(12).toString("hex")}.jpg`;
    try {
      const result = await exec(`umask 077; scrot -o -p -q 85 ${quote(path)} || import -window root -quality 85 ${quote(path)}`);
      if (result.exitCode !== 0 || result.timedOut) return resultText(result);
      const image = await abortable(signal, () => machines.readFile(machineId, path, { maxBytes: INSTABOX_SCREENSHOT_MAX_BYTES }));
      signal.throwIfAborted();
      if (image.byteLength > INSTABOX_SCREENSHOT_MAX_BYTES) return text("Screenshot exceeds the 16 MiB limit.", true);
      return { content: [{ type: "image", mimeType: "image/jpeg", data: Buffer.from(image).toString("base64") }] };
    } finally {
      await exec(`rm -f -- ${quote(path)}`, AbortSignal.timeout(1000)).catch(() => {});
    }
  }
  if (name === "exec" && args.background === true) return startBackground(exec, machineId, String(args.command), request);
  if (name === "exec_status") return backgroundStatus(exec, machineId, args as { process_id: string; wait_seconds?: number }, signal);
  let command = name === "exec" ? String(args.command) : cloudComputerDesktopCommand(name, args)!;
  if (name === "type_text") command = `if command -v xclip >/dev/null 2>&1; then ${command}; else xdotool type --clearmodifiers -- ${quote(String(args.text))}; fi`;
  const result = await exec(command);
  signal.throwIfAborted();
  if (result.timedOut) return text(commandLateText(name, args) ?? CLOUD_COMPUTER_LATE, true);
  if (name === "open_url" && result.exitCode === 0) return text(CLOUD_COMPUTER_BROWSER_REQUESTED);
  return resultText(result);
}
