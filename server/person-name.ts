import { nameFromEmail } from "../shared/bot-owner.ts";
import type { Message } from "./store.ts";
import { personKey } from "./person-key.ts";
import type { SessionRecord } from "./sessions.ts";

export interface PersonNameOptions {
  teamName?: string | null;
  profileName?: string | null;
  fallback?: string;
}

export function personDisplayName(session: Pick<SessionRecord, "displayName" | "email">, options: PersonNameOptions = {}): string {
  const displayName = session.displayName?.trim();
  if (displayName) return displayName;
  const teamName = options.teamName?.trim();
  if (teamName) return teamName;
  const email = session.email?.trim();
  if (email) return nameFromEmail(email);
  const profileName = options.profileName?.trim();
  if (profileName) return profileName;
  return options.fallback ?? "Member";
}

export function sessionMatchesPerson(session: Pick<SessionRecord, "id" | "email">, key: string): boolean {
  return personKey(session) === key || personKey({ id: session.id }) === key;
}

export function sessionSpeakerName(line: Pick<Message, "sender">, sessions: readonly Pick<SessionRecord, "id" | "email" | "displayName">[], options: PersonNameOptions = {}): string {
  const key = line.sender?.id;
  const session = key ? sessions.find((candidate) => sessionMatchesPerson(candidate, key)) : undefined;
  return session ? personDisplayName(session, options) : options.profileName?.trim() || options.fallback || "Member";
}

export function hasMultipleSessionPeople(sessions: readonly Pick<SessionRecord, "accessIdentity" | "email" | "token" | "owner">[]): boolean {
  const people = sessions.filter((session) => !session.token && !session.owner);
  const accessEmails = new Set(people.filter((session) => session.accessIdentity).map((session) => session.email?.trim().toLowerCase()));
  const identities = people.flatMap((session) => {
    if (session.accessIdentity) return [`access:${session.accessIdentity}`];
    const email = session.email?.trim().toLowerCase();
    return email && !accessEmails.has(email) ? [`email:${email}`] : [];
  });
  return new Set(identities).size > 1;
}
