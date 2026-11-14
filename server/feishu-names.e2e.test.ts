import { randomBytes } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { personKey } from "./person-key.ts";
import { SessionRegistry } from "./sessions.ts";
import { launchRestartableServer } from "./testing/restartable-server.ts";
import type { Message } from "./store.ts";

it.each([false, true])("serves historical names through index without changing Team Cloud history (team=%s)", async (team) => {
  const env: NodeJS.ProcessEnv = {};
  const fixture = await launchRestartableServer({ env });
  const api = async (path: string, token?: string, body?: unknown) => {
    const response = await fetch(`${fixture.url}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    expect(response.ok, await response.clone().text()).toBe(true);
    return response.json();
  };
  try {
    const { bot } = await api("/api/bots", undefined, { name: "Names fixture", visibility: "everyone" });
    await fixture.stop();
    const configFile = join(fixture.dataDir, "config.json");
    const config = JSON.parse(readFileSync(configFile, "utf8"));
    writeFileSync(configFile, JSON.stringify({ ...config, profile: { name: "Local profile" } }));
    const sessions = new SessionRegistry({ file: join(fixture.dataDir, "sessions.json") });
    const first = sessions.issueAccess("zhang", "Chrome on Mac");
    const oldKey = personKey({ id: first.session.id });
    sessions.refreshAccessDetails(first.session.id, { email: "zhang@example.test", displayName: "张三" });
    const second = sessions.issueAccess("alex", "Safari on iPhone", { email: "alex@example.test", displayName: "Alex" });
    sessions.close();
    const rows: Message[] = [
      { id: "old-key", role: "user", kind: "text", at: Date.now(), text: "First speaker", sender: { id: oldKey, name: "Chrome on Mac" } },
      { id: "current-key", role: "user", kind: "text", at: Date.now() + 1, text: "Second speaker", sender: { id: personKey({ id: second.session.id, email: "alex@example.test" }), name: "Safari on iPhone" } },
      { id: "unknown-key", role: "user", kind: "text", at: Date.now() + 2, text: "Unknown speaker", sender: { id: personKey({ id: "gone" }), name: "Safari on iPhone" } },
    ];
    const database = new DatabaseSync(join(fixture.dataDir, "messages.db"));
    try {
      const insert = database.prepare("INSERT INTO messages (thread_id, id, at, role, kind, text, json) VALUES (?, ?, ?, ?, ?, ?, ?)");
      for (const row of rows) insert.run(bot.threadId, row.id, row.at, row.role, row.kind, row.text!, JSON.stringify(row));
      database.prepare("INSERT OR REPLACE INTO thread_state (thread_id, active_leaf_id) VALUES (?, ?)").run(bot.threadId, "unknown-key");
    } finally {
      database.close();
    }
    if (team) Object.assign(env, {
      CRYBOT_CLOUD_ROLE: "team", CRYBOT_CLOUD_TEAM_ID: "team-fixture", CRYBOT_CLOUD_TEAM_NAME: "Fixture",
      CRYBOT_CLOUD_MACHINE_ID: "machine-fixture", CRYBOT_CLOUD_ADMIN_URL: "https://cloud.example.test",
      CRYBOT_CLOUD_BOOTSTRAP_SECRET: randomBytes(32).toString("base64url"), CRYBOT_PUBLIC_URL: "https://team.example.test",
    });
    await fixture.start();
    for (const suffix of ["?limit=200", "?around=old-key&limit=200"]) {
      const page = await api(`/api/threads/${bot.threadId}/messages${suffix}`, first.token);
      const named = (id: string) => page.messages.find((message: Message) => message.id === id)?.sender?.name;
      expect(named("old-key")).toBe(team ? "Chrome on Mac" : "张三");
      expect(named("current-key")).toBe(team ? "Safari on iPhone" : "Alex");
      expect(named("unknown-key")).toBe("Safari on iPhone");
    }
    const stored = new DatabaseSync(join(fixture.dataDir, "messages.db"), { readOnly: true });
    try {
      const row = stored.prepare("SELECT json FROM messages WHERE id = ?").get("old-key")!;
      expect(JSON.parse(String(row.json)).sender.name).toBe("Chrome on Mac");
    } finally {
      stored.close();
    }
    if (team) return;
    expect((await api("/api/auth/session", first.token)).reactor).toBe(personKey({ id: first.session.id, email: "zhang@example.test" }));
    const dumpFile = join(fixture.dataDir, "fake-claude-dump.json");
    for (const [replyToId, expectedName] of [["old-key", "张三"], ["current-key", "Alex"], ["unknown-key", "Local profile"]]) {
      rmSync(dumpFile, { force: true });
      await api(`/api/bots/${bot.id}/messages`, second.token, { text: "Please answer this line", threadId: bot.threadId, replyToId });
      await expect.poll(() => {
        try { return JSON.stringify(JSON.parse(readFileSync(dumpFile, "utf8")).prompt); } catch { return ""; }
      }, { timeout: 30_000 }).toContain(`The current message is a reply to an earlier message from ${expectedName}.`);
      const dump = JSON.parse(readFileSync(dumpFile, "utf8"));
      expect(JSON.stringify(dump.prompt)).not.toContain("from Safari on iPhone.");
      expect(JSON.stringify(dump.prompt)).not.toContain("from Chrome on Mac.");
      await expect.poll(async () => {
        const { bots } = await api("/api/bots", second.token);
        const current = bots.find((entry: { id: string }) => entry.id === bot.id);
        return Boolean(current.busy || current.activity === "working");
      }, { timeout: 30_000 }).toBe(false);
    }
  } finally {
    await fixture.close();
  }
}, 120_000);
