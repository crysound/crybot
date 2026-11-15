import type { WireBot, WireMessage } from "./wire";

/** Local desktop preferences, shared by every place shown in this app. */
export interface IslandSettings { enabled: boolean; fullscreen: boolean; width: number }
export interface IslandState { mode: "hidden" | "summary" | "list" | "chat"; botId: string | null; typing: boolean; notice?: "place-changed" }
export type IslandAction = { type: "enter" | "leave" | "timeout" | "expand" | "back" | "escape" | "outside" | "place" | "dismiss" } | { type: "select"; botId: string } | { type: "typing"; value: boolean };
export interface IslandGeometry { menuHeight: number; notched: boolean; sensorWidth: number; x: number; y: number; width: number; height: number }
/** Snapshot from main; avatars contain only raster data URLs fetched with the current place's session. */
export interface IslandSnapshot {
  revision: number;
  bots: WireBot[];
  avatars: Record<string, string>;
  online: boolean;
  chat: { botId: string; threadId: string; messages: WireMessage[]; streaming: string } | null;
}
/** The island cannot choose a server, URL, thread, or arbitrary IPC channel. */
export interface IslandBridge {
  ready(): Promise<{ state: IslandState; snapshot: IslandSnapshot; geometry: IslandGeometry; language: string }>;
  action(action: IslandAction): Promise<void>;
  send(revision: number, text: string): Promise<void>;
  respond(revision: number, requestId: string, behavior: "allow" | "deny"): Promise<void>;
  open(revision: number): Promise<void>;
  onUpdate(listener: (value: { state: IslandState; snapshot: IslandSnapshot; geometry: IslandGeometry; language: string }) => void): () => void;
}
