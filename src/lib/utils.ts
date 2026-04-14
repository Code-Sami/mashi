import crypto from "node:crypto";

export function generateInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export function getInitials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
