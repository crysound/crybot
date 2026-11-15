import type { WireBot, OptionCardData } from "../shared/wire";
import type { IslandState, IslandAction, IslandGeometry } from "../shared/island";
export const HIDDEN: IslandState;
export function islandTransition(state: IslandState, event: IslandAction): IslandState;
export function islandGeometry(display: { bounds: { x: number; y: number; width: number }; workArea: { y: number } }, width?: number): IslandGeometry;
export function botStatus(bot: WireBot, online?: boolean): "offline" | "waiting" | "working" | "idle";
export function sortIslandBots(bots: WireBot[]): WireBot[];
export function islandCounts(bots: WireBot[], online?: boolean): { total: number; working: number; waiting: number };
export function latestThread(bot: WireBot): string;

export function islandShape(mode: IslandState["mode"], geometry: IslandGeometry): { width: number; height: number; radius: number };
export function islandHitTest(point: { x: number; y: number }, geometry: IslandGeometry, mode: IslandState["mode"]): boolean;

export function islandPermission(card: OptionCardData): boolean;
