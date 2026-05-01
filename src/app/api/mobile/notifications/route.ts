import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireApiUserId, fullName } from "@/lib/mobile-api";
import { connectToDatabase } from "@/lib/mongodb";
import { NotificationModel } from "@/models/Notification";
import { UserModel } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const notifications = await NotificationModel.find({ recipientUserId: userId })
    .sort({ createdAt: -1 })
    .limit(80)
    .lean();
  const actorIds = [
    ...new Set(
      notifications.map((n) => n.actorUserId?.toString()).filter((v): v is string => Boolean(v)),
    ),
  ];
  const actors = actorIds.length ? await UserModel.find({ _id: { $in: actorIds } }).lean() : [];
  const actorMap = new Map(actors.map((u) => [u._id.toString(), u]));

  return NextResponse.json({
    notifications: notifications.map((n) => {
      const actorId = n.actorUserId?.toString() || null;
      const payload = (n.payload || {}) as Record<string, unknown>;
      const message =
        (typeof payload.question === "string" && payload.question) ||
        (typeof payload.groupName === "string" && payload.groupName) ||
        (typeof payload.reason === "string" && payload.reason) ||
        "";
      return {
        id: n._id.toString(),
        type: n.type,
        actorUserID: actorId,
        actorName: actorId ? fullName(actorMap.get(actorId) || {}) : null,
        groupID: n.groupId?.toString() || null,
        marketID: n.marketId?.toString() || null,
        message,
        readAt: n.readAt?.toISOString() || null,
        createdAt: n.createdAt?.toISOString() || null,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { action?: string; notificationID?: string };
  await connectToDatabase();

  if (body.action === "mark_all_read") {
    await NotificationModel.updateMany(
      { recipientUserId: new Types.ObjectId(userId), readAt: null },
      { $set: { readAt: new Date() } },
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "mark_read" && body.notificationID) {
    await NotificationModel.updateOne(
      { _id: new Types.ObjectId(body.notificationID), recipientUserId: new Types.ObjectId(userId) },
      { $set: { readAt: new Date() } },
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
