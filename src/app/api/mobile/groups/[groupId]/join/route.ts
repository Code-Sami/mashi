import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { logMemberJoinedActivity } from "@/lib/member-join-activity";
import { requireApiUserId } from "@/lib/mobile-api";
import { GroupModel } from "@/models/Group";
import { GroupMemberModel } from "@/models/GroupMember";

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
  const group = await GroupModel.findById(groupId).lean();
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if ((group as { visibility?: string }).visibility === "private") {
    return NextResponse.json(
      { error: "This group is private. Request access instead." },
      { status: 400 },
    );
  }

  const userOid = new Types.ObjectId(userId);
  const groupOid = new Types.ObjectId(groupId);
  const existing = await GroupMemberModel.findOne({ groupId: groupOid, userId: userOid }).lean();

  if (existing) {
    const memberRows = await GroupMemberModel.find({ groupId: groupOid }, { groupId: 1 }).lean();
    const memberCount = memberRows.length;
    return NextResponse.json({
      ok: true,
      alreadyMember: true,
      group: {
        id: group._id.toString(),
        name: group.name,
        description: group.description || "",
        visibility: (group as { visibility?: string }).visibility || "public",
        memberCount,
      },
    });
  }

  await GroupMemberModel.create({ groupId: groupOid, userId: userOid, role: "member" });
  await logMemberJoinedActivity({
    groupId: groupOid,
    actorUserId: userOid,
    via: "organic_public",
  });

  const memberRows = await GroupMemberModel.find({ groupId: groupOid }, { groupId: 1 }).lean();
  const memberCount = memberRows.length;

  return NextResponse.json({
    ok: true,
    alreadyMember: false,
    group: {
      id: group._id.toString(),
      name: group.name,
      description: group.description || "",
      visibility: (group as { visibility?: string }).visibility || "public",
      memberCount,
    },
  });
}
