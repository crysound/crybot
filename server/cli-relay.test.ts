import { describe, expect, it } from "vitest";

import { applyStartupPreferences, parseArgs, type CliOptions } from "./cli.ts";
import { relayPairingBlock, relayProblemLines, showRelayPairing } from "./cli-pairing.ts";
import { serviceServeArgs } from "./service-cli.ts";
import type { PhoneRelayStatus } from "./phone-relay.ts";

const status = (over: Partial<PhoneRelayStatus> = {}): PhoneRelayStatus => ({ relay: "connected", node: "relay1.crybot.com", grant: "ok", phones: 1, maxPhones: 20, ...over });
const invite = "crybot://pair?address=relay-only.invalid%3A443&token=cry_pair_x&e2e=eyJ2IjoxfQ";

describe("crybot serve --relay", () => {
  it("is off unless asked for, joins any way in but --tunnel, and never a local start", () => {
    expect(parseArgs(["serve"], {})).not.toHaveProperty("relay");
    expect(parseArgs(["serve", "--relay"], {})).toMatchObject({ command: "serve", relay: true });
    expect(parseArgs(["serve", "--relay", "--domain", "bot.example.com"], {})).toMatchObject({ relay: true, domain: "bot.example.com" });
    expect(parseArgs(["serve", "--tailscale", "--relay"], {})).toMatchObject({ relay: true, tailscale: true });
    expect(parseArgs(["service", "install", "--relay"], {})).toMatchObject({ command: "service", relay: true });
    expect(parseArgs(["serve", "--relay", "--tunnel"], {})).toHaveProperty("error");
    expect(parseArgs(["serve", "--tailscale", "--tunnel"], {})).toHaveProperty("error");
    expect(parseArgs(["--local", "--relay"], {})).toEqual({ error: "--local cannot be combined with a remote-access option" });
  });

  it("prints the relay QR for a phone code, and the usual block for everything else", () => {
    const body = { inviteUrl: invite, expiresAt: Date.now() + 600_000, relay: status() };
    const block = relayPairingBlock(body, true, "crybot")!;
    expect(block).toContain("Scan with the CryBot app. It connects through CryBot Relay, end-to-end encrypted");
    expect(block).toContain("Paired phones: 1 of 20. Remove one: crybot devices revoke ID");
    expect(relayPairingBlock(body, false, "crybot")).toBeNull();
    expect(relayPairingBlock({ ...body, relay: undefined }, true, "crybot")).toBeNull();
    expect(relayPairingBlock({ ...body, inviteUrl: "crybot://pair?address=https%3A%2F%2Fbot.example.com&token=cry_pair_x" }, true, "crybot")).toBeNull();
  });

  it("says why a phone cannot pair yet, in the person's terms", () => {
    expect(relayProblemLines(null, "crybot")).toEqual(["CryBot Relay is off on this server. Start it with: crybot serve --relay"]);
    expect(relayProblemLines(status({ grant: "signed-out", relay: "off" }), "crybot")[0]).toMatch(/CRYBOT_PHONE_RELAY_TOKEN/);
    expect(relayProblemLines(status({ grant: "unavailable", relay: "off" }), "npx crybot")[0]).toMatch(/not available for this machine right now\. The server keeps working here/);
    expect(relayProblemLines(status({ relay: "connecting", node: null }), "crybot")[0]).toMatch(/^Can't reach CryBot Relay yet\. The server keeps working here/);
    expect(relayProblemLines(status(), "crybot")).toEqual([]);
  });

  it("waits for the relay before making a code, and makes none it can't use", async () => {
    const reads = [status({ grant: "waiting", relay: "off" }), status({ relay: "connecting" }), status()];
    const lines: string[] = [];
    let minted = 0;
    const mint = async () => `code ${++minted}`;
    expect(await showRelayPairing({ tty: true, status: async () => reads.shift() ?? status(), mint, log: (line) => lines.push(line), prefix: "crybot", waitMs: 5_000 })).toBe(true);
    expect(lines).toEqual(["code 1"]);

    lines.length = 0;
    expect(await showRelayPairing({ tty: true, status: async () => status({ grant: "signed-out", relay: "off" }), mint, log: (line) => lines.push(line), prefix: "crybot", waitMs: 0 })).toBe(false);
    expect(minted).toBe(1);
    expect(lines[1]).toBe("Then: crybot pair --phone");
  });

  it("never prints the one-time credential into a service's log", async () => {
    const lines: string[] = [];
    let minted = 0;
    expect(await showRelayPairing({ tty: false, status: async () => status(), mint: async () => `code ${++minted}`, log: (line) => lines.push(line), prefix: "crybot" })).toBe(false);
    expect(minted).toBe(0);
    expect(lines).toEqual(["Pair a phone: crybot pair --phone"]);
  });

  it("keeps a saved tunnel choice and the relay apart, and passes --relay to a service", () => {
    const start = (argv: string[]) => {
      const parsed = parseArgs(argv, {});
      if ("error" in parsed) throw new Error(parsed.error);
      return parsed as CliOptions;
    };
    expect(applyStartupPreferences(start(["start", "--relay"]), { access: "local" })).toMatchObject({ relay: true });
    expect(applyStartupPreferences(start(["start", "--relay"]), undefined)).toMatchObject({ relay: true });
    expect(applyStartupPreferences(start(["start"]), { access: "tailscale" })).toMatchObject({ tailscale: true });
    expect(serviceServeArgs({ port: 8799, dataDir: "/d", relay: true })).toEqual(["--port", "8799", "--data-dir", "/d", "--relay"]);
    expect(serviceServeArgs({ port: 8799, dataDir: "/d", domain: "bot.example.com", relay: true })).toEqual(["--port", "8799", "--data-dir", "/d", "--domain", "bot.example.com", "--relay"]);
    expect(serviceServeArgs({ port: 8799, dataDir: "/d" })).toEqual(["--port", "8799", "--data-dir", "/d"]);
  });
});
