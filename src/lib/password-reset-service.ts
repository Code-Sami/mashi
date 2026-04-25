import "server-only";
import { hash } from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { appBaseUrl, sendPasswordResetEmail } from "@/lib/password-reset-email";
import { generatePasswordResetTokenPlain, hashPasswordResetToken } from "@/lib/password-reset-token";
import { PasswordResetTokenModel } from "@/models/PasswordResetToken";
import { UserModel } from "@/models/User";

/** 30 minutes — within checklist 15–30 min window */
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidPasswordResetEmail(email: string) {
  return EMAIL_RE.test(email);
}

/** Same rule as sign-up: minimum 8 characters */
export function validateNewPasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

/**
 * Never reveals whether the email exists. Returns ok unless the address is malformed.
 * On send failure, tokens are removed and we still return ok (no enumeration / noisy errors).
 */
export async function requestPasswordResetByEmail(rawEmail: string): Promise<
  | { ok: true }
  | { ok: false; reason: "invalid_email" }
> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !isValidPasswordResetEmail(email)) {
    return { ok: false, reason: "invalid_email" };
  }

  await connectToDatabase();
  const user = await UserModel.findOne({ email }).lean();
  if (!user) {
    return { ok: true };
  }

  await PasswordResetTokenModel.deleteMany({ userId: user._id });

  const plainToken = generatePasswordResetTokenPlain();
  const tokenHash = hashPasswordResetToken(plainToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await PasswordResetTokenModel.create({
    userId: user._id,
    tokenHash,
    expiresAt,
    used: false,
  });

  const resetUrl = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(plainToken)}`;
  const expiresInMinutes = PASSWORD_RESET_TTL_MS / 60_000;

  try {
    await sendPasswordResetEmail(user.email, resetUrl, { expiresInMinutes });
  } catch (e) {
    console.error("[password-reset] send failed:", e);
    await PasswordResetTokenModel.deleteMany({ userId: user._id });
  }

  return { ok: true };
}

export type ResetPasswordErrorCode = "weak_password" | "invalid_or_expired";

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; error: ResetPasswordErrorCode; message?: string };

export async function resetPasswordWithToken(
  plainToken: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  const token = plainToken.trim();
  if (!token || token.length < 32) {
    return {
      ok: false,
      error: "invalid_or_expired",
      message:
        "This link is invalid, expired, or was already used. Request a new reset from the Forgot Password page.",
    };
  }

  const strength = validateNewPasswordStrength(newPassword);
  if (strength) {
    return { ok: false, error: "weak_password", message: strength };
  }

  const tokenHash = hashPasswordResetToken(token);
  await connectToDatabase();

  const record = await PasswordResetTokenModel.findOne({
    tokenHash,
    used: { $ne: true },
    $or: [{ usedAt: null }, { usedAt: { $exists: false } }],
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    return {
      ok: false,
      error: "invalid_or_expired",
      message: "This link is invalid, expired, or was already used. Request a new reset from forgot password.",
    };
  }

  const passwordHash = await hash(newPassword, 10);
  await UserModel.updateOne({ _id: record.userId }, { $set: { passwordHash } });
  await PasswordResetTokenModel.updateOne(
    { _id: record._id },
    { $set: { used: true, usedAt: new Date() } }
  );
  await PasswordResetTokenModel.deleteMany({ userId: record.userId, _id: { $ne: record._id } });

  console.info("[password-reset] password updated", { userId: String(record.userId) });

  return { ok: true };
}
