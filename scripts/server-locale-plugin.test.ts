import { fileURLToPath } from "node:url";

import { build } from "esbuild";
import { describe, expect, it } from "vitest";

import { serverLinesOnly, serverLocalePlugin } from "./server-locale-plugin.mjs";

const SERVER_LINES = fileURLToPath(new URL("../server/server-line-packs.ts", import.meta.url));

describe("the server's bundle of the language packs", () => {
  it("keeps only the lines the server writes", () => {
    expect(serverLinesOnly({ "server.reports.sent": "Sent", "chat.turnStopped": "Stopped", "serverish.key": "x" })).toEqual({ "server.reports.sent": "Sent" });
  });

  it("carries every language's server lines and none of the app's screens", async () => {
    const bundled = await build({ entryPoints: [SERVER_LINES], bundle: true, write: false, platform: "node", format: "esm", charset: "utf8", plugins: [serverLocalePlugin], logLevel: "silent" });
    const code = bundled.outputFiles[0]!.text;
    expect(code).toContain("另一位队友刚刚问了同样的问题，所以这里会使用那个回答，而不是再生成一个。");
    expect(code).toContain("Another teammate asked the same a moment ago, so this gets that answer instead of a second one.");
    expect(code).not.toContain("notice.openFailed");
    expect(code.length).toBeLessThan(1_000_000);
  });
});
