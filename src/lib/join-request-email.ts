import "server-only";
import { Resend } from "resend";
import { buildUnsubscribeUrl } from "@/lib/email-unsubscribe";
import { appBaseUrl } from "@/lib/password-reset-email";

const DEFAULT_FROM = "Mashi <no-reply@mashimarkets.com>";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function href(url: string) {
  return url.replace(/"/g, "%22");
}

function resendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");
  return new Resend(apiKey);
}

export async function sendJoinRequestSubmittedEmail(params: {
  to: string;
  recipientUserId: string;
  actorName: string;
  groupName: string;
  groupUrl: string;
}) {
  const resend = resendClient();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
  const unsubscribeUrl = buildUnsubscribeUrl(params.recipientUserId, "join_request_owner");
  const groupUrl = href(params.groupUrl);
  const unsub = href(unsubscribeUrl);

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `${params.actorName} requested to join ${params.groupName}`,
    html: `
      <p style="font-family: system-ui, sans-serif;">${esc(params.actorName)} requested to join <strong>${esc(params.groupName)}</strong>.</p>
      <p style="margin: 20px 0;">
        <a href="${groupUrl}" style="display:inline-block;padding:12px 22px;background:#0f766e;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Review join requests</a>
      </p>
      <p style="font-family: system-ui, sans-serif; font-size: 12px; color:#666;">
        <a href="${unsub}" style="color:#0f766e;">Unsubscribe</a>
      </p>
    `,
  });
  if (error) throw new Error(error.message || "Failed to send join request email.");
}

export async function sendJoinRequestDecisionEmail(params: {
  to: string;
  recipientUserId: string;
  groupName: string;
  groupUrl: string;
  approved: boolean;
}) {
  const resend = resendClient();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
  const unsubscribeUrl = buildUnsubscribeUrl(params.recipientUserId, "join_request_decision");
  const groupUrl = href(params.groupUrl);
  const unsub = href(unsubscribeUrl);
  const subject = params.approved
    ? `Your request to join ${params.groupName} was approved`
    : `Your request to join ${params.groupName} was denied`;
  const ctaLabel = params.approved ? "Open group" : "Go to My Groups";
  const ctaUrl = params.approved ? groupUrl : href(`${appBaseUrl()}/groups`);

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject,
    html: `
      <p style="font-family: system-ui, sans-serif;">
        Your request to join <strong>${esc(params.groupName)}</strong> was
        <strong>${params.approved ? "approved" : "denied"}</strong>.
      </p>
      <p style="margin: 20px 0;">
        <a href="${ctaUrl}" style="display:inline-block;padding:12px 22px;background:#0f766e;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">${ctaLabel}</a>
      </p>
      <p style="font-family: system-ui, sans-serif; font-size: 12px; color:#666;">
        <a href="${unsub}" style="color:#0f766e;">Unsubscribe</a>
      </p>
    `,
  });
  if (error) throw new Error(error.message || "Failed to send join decision email.");
}
