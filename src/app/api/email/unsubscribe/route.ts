import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyUnsubscribeToken } from "@/lib/email-unsubscribe";
import { UserModel } from "@/models/User";

export const dynamic = "force-dynamic";

function html(title: string, body: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head><body style="font-family:system-ui,sans-serif;background:#f7f8fa;padding:24px;"><div style="max-width:560px;margin:24px auto;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;"><h1 style="margin:0 0 8px 0;font-size:20px;">${title}</h1><p style="margin:0;color:#444;">${body}</p></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request: NextRequest) {
  const u = request.nextUrl.searchParams;
  const verified = verifyUnsubscribeToken({
    uid: u.get("uid") || "",
    type: u.get("type") || "",
    exp: u.get("exp") || "",
    sig: u.get("sig") || "",
  });
  if (!verified.ok) {
    return html("Link invalid", "This unsubscribe link is invalid or expired.");
  }

  await connectToDatabase();
  if (verified.type === "join_request_owner") {
    await UserModel.updateOne({ _id: verified.uid }, { $set: { joinRequestOwnerEmailEnabled: false } });
    return html("Unsubscribed", "You will no longer receive join-request owner emails.");
  }
  await UserModel.updateOne({ _id: verified.uid }, { $set: { joinRequestDecisionEmailEnabled: false } });
  return html("Unsubscribed", "You will no longer receive join-request decision emails.");
}
