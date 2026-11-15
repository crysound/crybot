import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "../atomic.ts";
import { DATA_DIR } from "../config.ts";

type MachineRecord = { machineId: string; keyFingerprint: string | null };

export function createInstaboxMachineRecords(dataDir = DATA_DIR) {
  const file = join(dataDir, "instabox-machines.json");
  function read(): Map<string, MachineRecord> {
    let raw: string;
    try { raw = readFileSync(file, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
      throw error;
    }
    const records: unknown = JSON.parse(raw);
    if (!Array.isArray(records) || !records.every(row => Array.isArray(row) && (row.length === 2 || row.length === 3) && row.slice(0, 2).every(value => typeof value === "string" && value.length > 0) && (row[2] == null || typeof row[2] === "string" && /^[a-f0-9]{16}$/.test(row[2])))) {
      throw new Error("Invalid InstaBox machine records");
    }
    return new Map(records.map(([botId, machineId, keyFingerprint]) => [botId, { machineId, keyFingerprint: keyFingerprint ?? null }]));
  }
  function write(records: Map<string, MachineRecord>) {
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    writeFileAtomic(file, JSON.stringify([...records].map(([botId, record]) => [botId, record.machineId, record.keyFingerprint])), { mode: 0o600 });
  }
  return {
    has: (botId: string) => read().has(botId),
    get: (botId: string) => read().get(botId),
    remember(botId: string, machineId: string, keyFingerprint: string | null) {
      const records = read();
      const previous = records.get(botId);
      if (previous?.machineId === machineId && previous.keyFingerprint === keyFingerprint) return;
      records.set(botId, { machineId, keyFingerprint });
      write(records);
    },
    forget(botId: string) {
      const records = read();
      if (records.delete(botId)) write(records);
    },
  };
}
