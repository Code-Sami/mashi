import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireApiUserId } from "@/lib/mobile-api";
import { connectToDatabase } from "@/lib/mongodb";
import { logMemberJoinedActivity } from "@/lib/member-join-activity";
import { GroupInviteModel } from "@/models/GroupInvite";
import { GroupMemberModel } from "@/models/GroupMember";
import { GroupModel } from "@/models/Group";
import { JoinRequestModel } from "@/models/JoinRequest";

export const dynamic = "force-dynamic";

function isInviteValid(invite: {
  isActive?: boolean;
  expiresAt?: Date | null;
  maxUses?: number | null;
  useCount?: number;
}) {
  if (!invite || invite.isActive !== true) return false;
  if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) return false;
  if (typeof invite.maxUses === "number" && (invite.useCount || 0) >= invite.maxUses) return false;
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { code } = await params;

  await connectToDatabase();
  const invite = await GroupInviteModel.findOne({ code }).lean();
  if (!invite || !isInviteValid(invite)) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
  }

  const groupId = invite.groupId.toString();
  const group = await GroupModel.findById(groupId).lean();
  if (!group) return NextResponse.json({ error: "Invalid invite" }, { status: 400 });

  const userOid = new Types.ObjectId(userId);
  const groupOid = new Types.ObjectId(groupId);
  const existingMember = await GroupMemberModel.exists({ groupId: groupOid, userId: userOid });
  if (!existingMember) {
    await GroupMemberModel.create({ groupId: groupOid, userId: userOid, role: "member" });
    await GroupInviteModel.updateOne({ _id: invite._id }, { $inc: { useCount: 1 } });
    await logMemberJoinedActivity({
      groupId: groupOid,
      actorUserId: userOid,
      via: "invite_link",
    });
    await JoinRequestModel.deleteMany({ groupId: groupOid, userId: userOid, status: "pending" });
  }

  const memberCount = await GroupMemberModel.countDocuments({ groupId: groupOid });
  return NextResponse.json({
    ok: true,
    group: {
      id: group._id.toString(),
      name: group.name,
      description: group.description || "",
      visibility: group.visibility || "public",
      memberCount,
    },
  });
}
