import type { AppConfig } from "../config.ts";
import type { SessionRegistry } from "../sessions.ts";
import { personDisplayName, sessionsByPerson } from "../person-name.ts";

interface SessionNamesDeps {
  cfg: AppConfig;
  sessions: Pick<SessionRegistry, "list">;
  CLOUD_TEAM: boolean;
  sharedMembership(): boolean;
  appLanguage(): string | undefined;
}

export function createSessionNames({ cfg, sessions, CLOUD_TEAM, sharedMembership, appLanguage }: SessionNamesDeps) {
  /** What a signed-in person is called on their lines, cards and reactions. */
  function sessionPersonName(session: { displayName?: string; email?: string; accessEmail?: string; accessIdentity?: string }, teamName?: string): string {
    return personDisplayName(session, {
      teamName,
      profileName: !session.accessIdentity && !sharedMembership() ? cfg.profile?.name : undefined,
      fallback: appLanguage()?.startsWith("zh") ? "成员" : "Member",
    });
  }

  function sessionNameForPerson(key: string | undefined, fallback?: string, byPerson = sessionsByPerson(sessions.list())): string | undefined {
    if (CLOUD_TEAM || !key) return fallback;
    const session = byPerson.get(key);
    return session ? sessionPersonName(session) : fallback;
  }

  function sessionDisplayNameForPerson(key: string | undefined): string | undefined {
    if (!key) return undefined;
    return sessionsByPerson(sessions.list()).get(key)?.displayName;
  }

  function sessionNameForEmail(email: string): string | undefined {
    const normalized = email.trim().toLowerCase();
    const session = sessions.list().find((candidate) => (candidate.accessEmail ?? candidate.email)?.trim().toLowerCase() === normalized);
    return session?.displayName ? sessionPersonName(session) : undefined;
  }

  return { sessionPersonName, sessionNameForPerson, sessionDisplayNameForPerson, sessionNameForEmail };
}
