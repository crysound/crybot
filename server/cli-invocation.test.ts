import { describe, expect, it } from "vitest";

import { cliCommand, cliPrefix } from "./cli-invocation.ts";

describe("cliPrefix", () => {
  it("prints commands the way the CLI was started", () => {
    expect(cliPrefix({}, "/home/me/.npm/_npx/1a2b/node_modules/crybot/dist-server/crybot.js")).toBe("npx crybot");
    expect(cliPrefix({ npm_command: "exec" }, "/repo/node_modules/vitest/vitest.mjs"), "another tool run by npx").toBe("crybot");
    expect(cliPrefix({ npm_lifecycle_event: "cry" }, "/repo/server/crybot.ts")).toBe("pnpm cry");
    expect(cliPrefix({ CRYBOT_CLI_PREFIX: "docker compose exec cry crybot" }, "/app/dist-server/crybot.js")).toBe("docker compose exec cry crybot");
    expect(cliPrefix({}, "/usr/lib/node_modules/crybot/dist-server/crybot.js")).toBe("crybot");
    expect(cliCommand("pair", {}, "C:\\Users\\me\\AppData\\Local\\npm-cache\\_npx\\9\\node_modules\\crybot\\x.js")).toBe("npx crybot pair");
  });
});
