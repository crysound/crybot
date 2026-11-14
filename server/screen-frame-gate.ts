import { createHash } from "node:crypto";

import { screenSurfaceForTool as surfaceForTool, screenTouchingTool as touchingTool } from "../shared/tool-surface.ts";
import { computerToolTitle } from "./computer-tool-title.ts";
export { computerToolTitle };
export const screenSurfaceForTool = (name: string, input?: unknown) => surfaceForTool(computerToolTitle(name, input));
export const screenTouchingTool = (name: string, input?: unknown) => touchingTool(computerToolTitle(name, input));

export function screenFrameHash(png: string): string {
  return createHash("sha256").update(png).digest("hex");
}

export function settledFrameIsNews(shownFrameHash: string | undefined, png: string): boolean {
  return shownFrameHash === undefined || screenFrameHash(png) !== shownFrameHash;
}

