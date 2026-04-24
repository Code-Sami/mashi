import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export type EmailUnsubscribeType = "join_request_owner" | "join_request_decision";

function baseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) throw new Error("Set NEXT_PUBLIC_APP_URL so unsubscribe links can be generated.");
  return raw.replace(/\/$/, "");
}

function secret() {
  const s = process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!s) throw new Error("Set EMAIL_UNSUBSCRIBE_SECRET (or NEXTAUTH_SECRET) for unsubscribe signing.");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload, "utf8").digest("hex");
}

export function buildUnsubscribeUrl(userId: string, type: EmailUnsubscribeType, ttlHours = 24 * 30) {
  const exp = Math.floor(Date.now() / 1000) + ttlHours * 3600;
  const payload = `${userId}:${type}:${exp}`;
  const sig = sign(payload);
  const q = new URLSearchParams({ uid: userId, type, exp: String(exp), sig });
  return `${baseUrl()}/api/email/unsubscribe?${q.toString()}`;
}

export function verifyUnsubscribeToken(params: { uid: string; type: string; exp: string; sig: string }) {
  const { uid, type, exp, sig } = params;
  if (!uid || !type || !exp || !sig) return { ok: false as const, reason: "missing" };
  if (type !== "join_request_owner" && type !== "join_request_decision") {
    return { ok: false as const, reason: "type" };
  }
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) {
    return { ok: false as const, reason: "expired" };
  }
  const payload = `${uid}:${type}:${expNum}`;
  const expected = sign(payload);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false as const, reason: "sig" };
  }
  return { ok: true as const, uid, type: type as EmailUnsubscribeType };
}
