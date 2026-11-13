// Exact app-owned browser state that belongs in an encrypted full backup.
// Never include cookies, authentication tokens, connection caches or unknown keys.
export const WORKSPACE_BACKUP_CLIENT_KEYS = [
  "cry-drafts",
  "cry-draft-attachments",
  "cry-draft-send-ids",
  "cry-draft-channel-modes",
  "cry-skin",
  "cry-show-threads",
  "cry-show-run-card",
  "cry-send-key",
  "cry-color-user-bubbles",
  "cry-chat-width",
  "crybot.sidebarDensity",
  "crybot.sidebarToolsLayout",
  "crybot.sidebarCollapsedSections.v1",
  "crybot.sidebarSectionOrder.v1",
  "cry-analytics-opt-out",
  "crybot.remote-voice.v1",
] as const;

export type WorkspaceBackupClientState = Partial<Record<(typeof WORKSPACE_BACKUP_CLIENT_KEYS)[number], string>>;
