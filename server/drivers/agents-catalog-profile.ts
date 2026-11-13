// The CRYBOT_* switches the harness gives the agents proxy, read into the profile agents-catalog.ts lists tools for.

/** Which tools a conversation is shown, the same on every one of its turns. Presentation only: the server still
 * authenticates and scopes every call. */
export interface CatalogProfile {
  skillAuthoring: boolean;
  sharedComputers: boolean;
  voiceNotes: boolean;
  /** A treg key or a Cloud plan's research credential is held and this bot's research switch is on: x_search is mounted.
   * Absent means off. */
  xResearch?: boolean;
  /** As xResearch, and research works for that credential (the person's treg key, or a plan whose relay has research
   * on): research_search, research_endpoint and research_call are mounted too. Absent means off. */
  research?: boolean;
  cloudHome: boolean;
  memoryEnabled?: boolean;
  /** The section's Chief of Staff; the server refuses Chief-only tools to every other bot. */
  chief: boolean;
  /** Only for Watcher's own tool. Never written into a schema: a list that names its bot can't share a prompt cache with other bots. */
  botId: string;
  /** A Team Cloud: message_person is mounted. */
  team?: boolean;
  /** The person's CryBot with a Chief's powers: its notification tools are mounted. */
  crybot?: boolean;
  /** A direct chat whose bot may pick where it works (Works on is not Off and no team computer is its own): select_computer
   * is mounted, and the harness refuses a pick on any turn but a person's own message. */
  computerSelection?: boolean;
  /** A room's thread: the wait tools are not mounted, since a room holds no wait. */
  room?: boolean;
  imageGeneration?: boolean;
  /** A cloud computer can be had here (Boat): the meeting tools and reset_cloud_computer are mounted. */
  meetings?: boolean;
  /** The plan's included app hosting reaches this server: publish_app is mounted. */
  appHosting?: boolean;
}

/** Everything is off unless the harness says "1". */
export function catalogProfileFromEnv(env: NodeJS.ProcessEnv): CatalogProfile {
  return {
    skillAuthoring: env.CRYBOT_SKILL_AUTHORING_ENABLED === "1",
    sharedComputers: env.CRYBOT_SHARED_COMPUTERS_ENABLED === "1",
    voiceNotes: env.CRYBOT_VOICE_NOTES === "1",
    xResearch: env.CRYBOT_X_RESEARCH === "1",
    research: env.CRYBOT_RESEARCH === "1",
    cloudHome: env.CRYBOT_CLOUD_HOME === "1",
    memoryEnabled: env.CRYBOT_MEMORY_ENABLED !== "0",
    chief: env.CRYBOT_CHIEF_OF_STAFF === "1",
    botId: env.CRYBOT_BOT_ID ?? "",
    team: env.CRYBOT_TEAM_PEOPLE === "1",
    crybot: env.CRYBOT_BOTBOT === "1",
    computerSelection: env.CRYBOT_COMPUTER_SELECTION === "1",
    room: env.CRYBOT_ROOM === "1",
    imageGeneration: env.CRYBOT_IMAGE_GENERATION === "1",
    meetings: env.CRYBOT_MEETINGS === "1",
    appHosting: env.CRYBOT_APP_HOSTING === "1",
  };
}
