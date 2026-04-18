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

export function relativeTime(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const absDiff = Math.abs(diff);
  const future = diff > 0;
  if (absDiff < 60_000) return future ? "in <1m" : "just now";
  if (absDiff < 3_600_000) {
    const m = Math.round(absDiff / 60_000);
    return future ? `in ${m}m` : `${m}m ago`;
  }
  if (absDiff < 86_400_000) {
    const h = Math.round(absDiff / 3_600_000);
    return future ? `in ${h}h` : `${h}h ago`;
  }
  const d = Math.round(absDiff / 86_400_000);
  return future ? `in ${d}d` : `${d}d ago`;
}
