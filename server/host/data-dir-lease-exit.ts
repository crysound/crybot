import type { DataDirLease } from "../data-dir-lease.ts";

export function createDataDirLeaseExit({ dataDirLease }: { dataDirLease: DataDirLease }) {
  let dataDirLeaseReleaseAttempted = false;
  function releaseDataDirLeaseAtExit(): void {
    if (dataDirLeaseReleaseAttempted) return;
    dataDirLeaseReleaseAttempted = true;
    try {
      dataDirLease.release();
    } catch (error) {
      console.error(`[data-directory] lease release failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { releaseDataDirLeaseAtExit };
}
