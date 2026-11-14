import type { CloudSwatch } from "./cloud-list.mjs";
import type { CloudColor } from "./cloud-types.mjs";
export interface RailPlace {
  id: string;
  name: string;
  color: CloudColor | null;
  kind: "computer" | "cloud" | "team" | "server" | "account";
  profile?: string;
  named?: true;
  settling?: string;
  group?: string;
  email?: string;
  signIn?: true;
  opens: boolean;
  active?: true;
  progress?: number;
  waiting?: true;
  attention?: true;
  server?: true;
  offline?: true;
  lastSeenAt?: number;
  ownNetwork?: true;
  pairs?: true;
  update?: { version: string; latest: string };
  paint?: { swatch: CloudSwatch | null; locked?: "member" | "signed-out" };
  ended?: true;
  removable?: true;
  forget?: true;
  makeHome?: true;
}
export interface RailAddChoices {
  cloud: boolean;
  link: boolean;
  address: boolean;
  organization?: boolean;
  account?: boolean;
  local?: boolean;
}
export interface RailState {
  places: RailPlace[];
  add: RailAddChoices;
  beside?: true;
  switching?: { id: string; waking?: true };
}
export declare const RAIL_MIN_PLACES: number;
export declare const PROFILE_PLACE: "profile:";
export declare function railPlaces(input: { saved: { environments: any[]; activeId: string }; home?: string | null; mine?: string | null; state?: unknown; offers?: (entry: any) => boolean; waiting?: (id: string) => boolean; accounts?: any[]; profiles?: Array<{ id: string; name?: string | null; color?: string | null; swatch?: string | null; active?: boolean; settling?: string }>; computerSettling?: string | null }): Array<RailPlace & { cloudId?: string }>;
