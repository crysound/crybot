import type { ChildProcess } from "node:child_process";
import { chmodSync, lstatSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

export interface WaitForExitOptions {
  /** Sent immediately. Omit for a child the caller has already signalled. */
  signal?: NodeJS.Signals;
  /** How long the polite signal gets before SIGKILL. */
  graceMs?: number;
}

/** Node kill() only sends a signal; close follows process exit and stdio closure. */
export function waitForExit(
  child: ChildProcess | undefined,
  options: WaitForExitOptions | number = {},
): Promise<void> {
  const { signal, graceMs = 5_000 } = typeof options === "number" ? { graceMs: options } : options;

  return new Promise<void>((resolve, reject) => {
    // A process killed by a signal reports it in signalCode and leaves exitCode null.
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolve();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = () => {
      if (timer) clearTimeout(timer);
      resolve();
    };
    child.once("close", done);

    if (signal) {
      try {
        child.kill(signal);
      } catch {}
    }

    timer = setTimeout(() => {
      child.kill("SIGKILL");
      timer = setTimeout(() => reject(new Error(`process ${child.pid} did not close after SIGKILL`)), 2_000);
      timer.unref?.();
    }, graceMs);
    timer.unref?.();
  });
}

function makeDirectoriesRemovable(dir: string): void {
  let info;
  try { info = lstatSync(dir); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  if (!info.isDirectory()) return;
  if ((info.mode & 0o700) !== 0o700) {
    try { chmodSync(dir, info.mode | 0o700); } catch (cause) {
      throw new Error(`Cannot repair test directory ${dir}: mode=${(info.mode & 0o777).toString(8)} uid=${info.uid} gid=${info.gid}`, { cause });
    }
  }
  for (const entry of readdirSync(dir)) makeDirectoriesRemovable(join(dir, entry));
}

export async function removeTempDirStrict(dir: string): Promise<void> {
  let lastError: unknown;
  for (let i = 0; i < 20; i++) {
    try {
      rmSync(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      if (["EACCES", "EPERM"].includes((error as NodeJS.ErrnoException).code ?? "")) makeDirectoriesRemovable(dir);
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw lastError;
}

export async function removeTempDir(dir: string): Promise<void> {
  try {
    await removeTempDirStrict(dir);
  } catch (error) {
    console.warn(`test cleanup could not remove ${dir}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
