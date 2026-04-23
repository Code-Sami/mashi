import "server-only";
import { Resend } from "resend";

const DEFAULT_FROM = "Mashi <no-reply@mashimarkets.com>";

/** Safe for HTML text nodes (not for raw href — use hrefAttr for attributes). */
function escapeHtmlText(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hrefAttr(url: string) {
  return url.replace(/"/g, "%22");
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  opts: { expiresInMinutes: number }
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[password-reset] RESEND_API_KEY is not set; cannot send email.");
    throw new Error("Email is not configured.");
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
  const href = hrefAttr(resetUrl);
  const linkText = escapeHtmlText(resetUrl);
  const minutes = opts.expiresInMinutes;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Reset your Mashi password",
    html: `
      <p style="font-family: system-ui, sans-serif; font-size: 16px; color: #111;">
        You asked to reset your password for Mashi.
      </p>
      <p style="font-family: system-ui, sans-serif; font-size: 15px; color: #444;">
        This link expires in <strong>${minutes} minutes</strong> for your security. If you did not request a reset, you can ignore this email.
      </p>
      <p style="margin: 28px 0;">
        <a href="${href}"
          style="display: inline-block; padding: 14px 28px; background: #0f766e; color: #fff; text-decoration: none; border-radius: 10px; font-family: system-ui, sans-serif; font-weight: 600; font-size: 15px;">
          Reset password
        </a>
      </p>
      <p style="font-family: system-ui, sans-serif; font-size: 13px; color: #666; word-break: break-all;">
        Or copy this link:<br /><a href="${href}" style="color: #0f766e;">${linkText}</a>
      </p>
    `,
  });

  if (error) {
    console.error("[password-reset] Resend error:", error);
    throw new Error(error.message || "Failed to send reset email.");
  }
}

function appBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) {
    throw new Error(
      "Set NEXT_PUBLIC_APP_URL in your environment (e.g. https://mashimarkets.com) so password-reset emails can link to your site."
    );
  }
  return raw.replace(/\/$/, "");
}

export { appBaseUrl };
