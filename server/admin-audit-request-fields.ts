import type { IncomingMessage } from "node:http";
import { parsedBodyOf } from "./harness/http.ts";

export function requestedBotFields(req: IncomingMessage, path: string): string[] {
  if (path.endsWith("/always-allow")) return ["alwaysAllow"];
  if (path.endsWith("/model")) return ["modelSelection"];
  const body = parsedBodyOf(req);
  if (!body || typeof body !== "object" || Array.isArray(body)) return [];
  const fields = new Set(Object.keys(body));
  if (fields.has("autoApprove") || fields.has("approvalMode")) fields.add("autoApprove").add("approvalMode");
  if (fields.has("chiefOfStaff")) fields.add("managedSections");
  return [...fields];
}

