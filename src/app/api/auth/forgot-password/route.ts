import { NextResponse } from "next/server";
import { allowForgotPasswordRequest } from "@/lib/forgot-password-rate-limit";
import { requestPasswordResetByEmail } from "@/lib/password-reset-service";

function clientIp(request: Request) {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 * Always 200 { ok: true } when email shape is valid (no user enumeration).
 * 400 for malformed body/email; 429 when rate limited.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("email" in body)) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const email = (body as { email?: unknown }).email;
  if (typeof email !== "string") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!allowForgotPasswordRequest(ip)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", message: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const result = await requestPasswordResetByEmail(email);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  console.info("[password-reset] forgot-password request processed", { ip });
  return NextResponse.json({ ok: true });
}
