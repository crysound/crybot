import { randomBytes } from "node:crypto";

export function newScreenPassword(): string {
  return randomBytes(6).toString("base64url");
}
