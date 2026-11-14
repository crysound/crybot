import { nameFromEmail } from "../shared/bot-owner.ts";
import type { Message } from "./store.ts";
import { personKey } from "./person-key.ts";
import type { SessionRecord } from "./sessions.ts";

export interface PersonNameOptions {
  teamName?: string | null;
  profileName?: string | null;
  fallback?: string;
}

export function personDisplayName(session: Pick<SessionRecord, "displayName" | "email" | "accessEmail">, options: PersonNameOptions = {}): string {
  const displayName = session.displayName?.trim();
  if (displayName) return displayName;
  const teamName = options.teamName?.trim();
  if (teamName) return teamName;
  const email = session.accessEmail?.trim() || session.email?.trim();
  if (email) return nameFromEmail(email);
  const profileName = options.profileName?.trim();
  if (profileName) return profileName;
  return options.fallback ?? "Member";
}

export function sessionsByPerson<T extends Pick<SessionRecord, "id" | "email">>(sessions: readonly T[]): ReadonlyMap<string, T> {
  const byPerson = new Map<string, T>();
  for (const session of sessions) {
    for (const key of [personKey(session), personKey({ id: session.id })]) {
      if (!byPerson.has(key)) byPerson.set(key, session);
    }
  }
  return byPerson;
}

export function sessionSpeakerName(line: Pick<Message, "sender">, sessions: ReadonlyMap<string, Pick<SessionRecord, "email" | "accessEmail" | "displayName">>, options: PersonNameOptions = {}): string {
  const key = line.sender?.id;
  const session = key ? sessions.get(key) : undefined;
  return session ? personDisplayName(session, options) : options.profileName?.trim() || options.fallback || "Member";
}

export function hasMultipleSessionPeople(sessions: readonly Pick<SessionRecord, "accessIdentity" | "accessEmail" | "email" | "token" | "owner">[]): boolean {
  const people = sessions.filter((session) => !session.token && !session.owner);
  const accessEmails = new Set(people.filter((session) => session.accessIdentity).map((session) => session.accessEmail?.trim().toLowerCase()));
  const identities = people.flatMap((session) => {
    if (session.accessIdentity) return [`access:${session.accessIdentity}`];
    const email = session.email?.trim().toLowerCase();
    return email && !accessEmails.has(email) ? [`email:${email}`] : [];
  });
  return new Set(identities).size > 1;
}
