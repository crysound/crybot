// Side-effect import that scrubs ambient CRY env before a module snapshots it (scripts/mcp-server.ts reads
// CRYBOT_URL / CRYBOT_PORT at evaluation). Import order is the contract: keep it above the module under test.
import { isAmbientCryKey } from "./cry-env.ts";

for (const key of Object.keys(process.env)) {
  if (isAmbientCryKey(key)) delete process.env[key];
}
