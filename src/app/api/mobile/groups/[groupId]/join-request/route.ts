import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { requireApiUserId } from "@/lib/mobile-api";
import { notifyJoinRequestSubmitted } from "@/lib/notifications";
import { GroupModel } from "@/models/Group";
import { GroupMemberModel } from "@/models/GroupMember";
import { JoinRequestModel } from "@/models/JoinRequest";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await params;
  if (!groupId) {
    return NextResponse.json({ error: "Group id required" }, { status: 400 });
  }

  await connectToDatabase();
  const group = await GroupModel.findById(groupId).lean() as { visibility?: string } | null;
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  if (group.visibility !== "private") {
    return NextResponse.json(
      { error: "Use join for public groups" },
      { status: 400 },
    );
  }

  const userOid = new Types.ObjectId(userId);
  const groupOid = new Types.ObjectId(groupId);

  const isMember = await GroupMemberModel.exists({ groupId: groupOid, userId: userOid });
  if (isMember) {
    return NextResponse.json({ ok: true, status: "already_member" });
  }

  const existingPending = await JoinRequestModel.findOne({
    groupId: groupOid,
    userId: userOid,
    status: "pending",
  }).lean();
  if (existingPending) {
    return NextResponse.json({ ok: true, status: "already_pending" });
  }

  await JoinRequestModel.deleteMany({ groupId: groupOid, userId: userOid, status: { $ne: "pending" } });

  const joinRequest = await JoinRequestModel.create({ groupId: groupOid, userId: userOid, status: "pending" });
  await notifyJoinRequestSubmitted({
    requestId: joinRequest._id.toString(),
    groupId,
    actorUserId: userId,
  });

  return NextResponse.json({ ok: true, status: "pending" });
}
