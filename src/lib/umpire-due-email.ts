import "server-only";
import { Resend } from "resend";

const DEFAULT_FROM = "Mashi <no-reply@mashimarkets.com>";

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

/**
 * Umpire reminder after a market’s deadline (paired with in-app `umpire_market_expired`).
 * Skips if RESEND_API_KEY is missing (logs; does not throw).
 */
export async function sendUmpireMarketDueEmail(
  to: string,
  opts: { marketUrl: string; question: string }
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[umpire-due] RESEND_API_KEY is not set; skipping umpire email.");
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
  const href = hrefAttr(opts.marketUrl);
  const q = escapeHtmlText(opts.question);
  const preheader = "The deadline has passed — open the market to resolve the outcome.";

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Time to resolve a market you’re umpiring",
    html: `
      <p style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${escapeHtmlText(preheader)}</p>
      <p style="font-family: system-ui, sans-serif; font-size: 16px; color: #111;">
        The deadline has passed for a market you’re the umpire for on Mashi. When the real-world outcome is clear, open the market and record the result.
      </p>
      <p style="font-family: system-ui, sans-serif; font-size: 15px; color: #333; margin: 12px 0 0; font-weight: 600;">${q}</p>
      <p style="margin: 24px 0;">
        <a href="${href}"
          style="display: inline-block; padding: 14px 28px; background: #0f766e; color: #fff; text-decoration: none; border-radius: 10px; font-family: system-ui, sans-serif; font-weight: 600; font-size: 15px;">
          Resolve the market
        </a>
      </p>
      <p style="font-family: system-ui, sans-serif; font-size: 13px; color: #666; word-break: break-all;">
        Or open this link:<br /><a href="${href}" style="color: #0f766e;">${escapeHtmlText(opts.marketUrl)}</a>
      </p>
    `,
  });

  if (error) {
    console.error("[umpire-due] Resend error:", error);
    throw new Error(error.message || "Failed to send umpire email.");
  }
}
