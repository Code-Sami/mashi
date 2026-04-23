import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset-service";

/**
 * POST /api/auth/reset-password
 * Body: { token: string, newPassword: string }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_or_expired", message: "Invalid request." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "invalid_or_expired", message: "Invalid request." },
      { status: 400 }
    );
  }

  const { token, newPassword } = body as { token?: unknown; newPassword?: unknown };
  if (typeof token !== "string" || typeof newPassword !== "string") {
    return NextResponse.json(
      { ok: false, error: "invalid_or_expired", message: "Invalid request." },
      { status: 400 }
    );
  }

  const result = await resetPasswordWithToken(token, newPassword);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        message: result.message ?? "Could not reset password.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
