import { promptWithReply } from "./replies.ts";
import { personKey } from "./person-key.ts";
import { describe, expect, it } from "vitest";
import { personDisplayName, hasMultipleSessionPeople, sessionMatchesPerson, sessionSpeakerName } from "./person-name.ts";

describe("personDisplayName", () => {
  it("prefers the claimed name and never uses a device label", () => {
    expect(personDisplayName({ displayName: " 张三 ", email: "zhang@example.test" }, { fallback: "Member" })).toBe("张三");
    expect(personDisplayName({ email: "alex.lee@example.test" }, { fallback: "Member" })).toBe("Alex Lee");
    expect(personDisplayName({ email: undefined, displayName: undefined }, { fallback: "Member" })).toBe("Member");
    expect(personDisplayName({ email: "alex@example.test" }, { teamName: "Team Alex", profileName: "Local profile" })).toBe("Team Alex");
    expect(personDisplayName({}, { profileName: " Local profile " })).toBe("Local profile");
    expect(personDisplayName({}, { fallback: "成员" })).toBe("成员");
  });
});

describe("session identities", () => {
  it("matches both the original session key and the current email key", () => {
    const session = { id: "first", email: "alex@example.test" };
    expect(sessionMatchesPerson(session, personKey({ id: "first" }))).toBe(true);
    expect(sessionMatchesPerson(session, personKey(session))).toBe(true);
    expect(sessionMatchesPerson(session, personKey({ id: "other" }))).toBe(false);
  });

  it("counts people rather than devices, tokens, guests or anonymous pairings", () => {
    const excluded = [{}, {}, { token: true as const, email: "script@example.test" }, { owner: "owner", email: "guest@example.test" }];
    expect(hasMultipleSessionPeople(excluded)).toBe(false);
    expect(hasMultipleSessionPeople([...excluded, { accessIdentity: "alex" }, { accessIdentity: "alex" }])).toBe(false);
    expect(hasMultipleSessionPeople([...excluded, { email: "ALEX@EXAMPLE.TEST" }, { email: "alex@example.test" }])).toBe(false);
    expect(hasMultipleSessionPeople([{ accessIdentity: "alex", email: "alex@example.test" }, { email: "ALEX@EXAMPLE.TEST" }])).toBe(false);
    expect(hasMultipleSessionPeople([{ accessIdentity: "alex", email: "alex@example.test" }, { accessIdentity: "other", email: "alex@example.test" }])).toBe(true);
    expect(hasMultipleSessionPeople([...excluded, { accessIdentity: "alex" }, { accessIdentity: "zhang" }])).toBe(true);
    expect(hasMultipleSessionPeople([{ email: "alex@example.test" }, { email: "zhang@example.test" }])).toBe(true);
  });
});

describe("names sent to AI", () => {
  const sessions = [
    { id: "first", email: "zhang@example.test", displayName: "张三" },
    { id: "second", email: "alex@example.test", displayName: "Alex" },
  ];
  const nameFor = (line: Parameters<typeof sessionSpeakerName>[0]) => sessionSpeakerName(line, sessions, { profileName: "Local profile", fallback: "User" });
  it("names each quoted speaker, including a key recorded before email was known", () => {
    for (const [key, expected] of [[personKey({ id: "first" }), "张三"], [personKey(sessions[1]!), "Alex"]]) {
      const line = { id: "line", at: 1, role: "user" as const, kind: "text" as const, text: "Hello", sender: { id: key, name: "Safari on iPhone" } };
      expect(nameFor(line)).toBe(expected);
      expect(promptWithReply("Reply", line, nameFor).split("\n")[0]).toBe(`The current message is a reply to an earlier message from ${expected}.`);
    }
  });
  it("uses the profile or a neutral name for an unknown speaker, never a device label", () => {
    const line = { sender: { id: personKey({ id: "gone" }), name: "Safari on iPhone" } };
    expect(nameFor(line)).toBe("Local profile");
    expect(sessionSpeakerName(line, sessions, { fallback: "User" })).toBe("User");
    expect(sessionSpeakerName({ sender: { name: "Chrome on Mac" } }, sessions)).toBe("Member");
    expect(sessionSpeakerName({}, sessions, { profileName: "Local profile" })).toBe("Local profile");
  });
});
