import { createHash, randomBytes } from "node:crypto";

export function generatePasswordResetTokenPlain() {
  return randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(plain: string) {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}
