import { createHash, randomBytes } from "crypto";

export function createEmployeeAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashEmployeeAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
