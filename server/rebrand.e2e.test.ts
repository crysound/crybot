import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { launchVerificationServer } from "../scripts/control-cry.ts";

it("serves the Cry Bot health and open-source edition from an isolated fixture", async () => {
  const auditDir = mkdtempSync(join(tmpdir(), "cry-startup-network-"));
  const audit = join(auditDir, "requests.log");
  writeFileSync(audit, "");
  let fixture: Awaited<ReturnType<typeof launchVerificationServer>> | undefined;
  try {
    fixture = await launchVerificationServer({ CRYBOT_TEST_NETWORK_LOG: audit });
    const health = await fetch(`${fixture.info.url}/api/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ app: "crybot" });
    const edition = await fetch(`${fixture.info.url}/api/edition`);
    expect(edition.status).toBe(200);
    expect(await edition.json()).toEqual({ edition: "oss", features: [] });
    expect(await (await fetch(`${fixture.info.url}/api/brand`)).json()).toEqual({ brand: { name: "Cry Bot" }, source: "default" });
    await new Promise(resolve => setTimeout(resolve, 3_000));
    expect(readFileSync(audit, "utf8")).toBe("");
  } finally {
    await fixture?.close();
    rmSync(auditDir, { recursive: true, force: true });
  }
}, 60_000);
