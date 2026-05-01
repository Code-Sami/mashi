import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

type SessionUser = {
  id?: string;
};

const MOBILE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

type MobileTokenPayload = {
  userId: string;
  exp: number;
};

function getMobileTokenSecret() {
  return process.env.NEXTAUTH_SECRET || "mashi-dev-insecure-secret-change-me";
}

function toBase64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function issueMobileToken(userId: string) {
  const payload: MobileTokenPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + MOBILE_TOKEN_TTL_SECONDS,
  };
  const payloadPart = toBase64Url(JSON.stringify(payload));
  const sigPart = toBase64Url(
    createHmac("sha256", getMobileTokenSecret()).update(payloadPart).digest(),
  );
  return `${payloadPart}.${sigPart}`;
}

export function verifyMobileToken(token: string): string | null {
  const [payloadPart, sigPart] = token.split(".");
  if (!payloadPart || !sigPart) return null;

  const expectedSig = createHmac("sha256", getMobileTokenSecret())
    .update(payloadPart)
    .digest();
  const providedSig = Buffer.from(sigPart, "base64url");
  if (
    providedSig.length !== expectedSig.length ||
    !timingSafeEqual(providedSig, expectedSig)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadPart)) as MobileTokenPayload;
    if (!payload.userId || !payload.exp) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

function getBearerToken(headers: Headers | null | undefined) {
  const raw = headers?.get("authorization") || "";
  if (!raw.startsWith("Bearer ")) return null;
  return raw.slice("Bearer ".length).trim() || null;
}

export async function requireApiUserId(headers?: Headers): Promise<string | null> {
  const bearerToken = getBearerToken(headers);
  if (bearerToken) {
    const tokenUserId = verifyMobileToken(bearerToken);
    if (tokenUserId) {
      await connectToDatabase();
      const exists = await UserModel.exists({ _id: tokenUserId });
      if (exists) return tokenUserId;
    }
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as SessionUser | undefined)?.id;
  if (!userId) return null;

  await connectToDatabase();
  const exists = await UserModel.exists({ _id: userId });
  return exists ? userId : null;
}

export function fullName(user: {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  name?: string;
  email?: string;
  username?: string;
}) {
  const combined = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  if (combined) return combined;

  const base = (user.displayName || user.name || "").trim();
  if (base) return base;

  const emailBase = user.email?.split("@")[0]?.trim();
  if (emailBase) return emailBase;

  return user.username || "Unknown user";
}
