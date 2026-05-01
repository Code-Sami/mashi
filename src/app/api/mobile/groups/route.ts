import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { requireApiUserId } from "@/lib/mobile-api";
import { getJoinModeFromVisibility, getOrCreateActiveGroupInvite } from "@/lib/invites";
import { logMemberJoinedActivity } from "@/lib/member-join-activity";
import { generateInviteCode } from "@/lib/utils";
import { GroupModel } from "@/models/Group";
import { GroupMemberModel } from "@/models/GroupMember";

export const dynamic = "force-dynamic";

function mobileGroupShape(group: {
  _id: { toString(): string };
  name: string;
  description?: string;
  visibility?: string;
}, memberCount: number) {
  return {
    id: group._id.toString(),
    name: group.name,
    description: group.description || "",
    visibility: group.visibility || "public",
    memberCount,
  };
}

export async function GET(request: NextRequest) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const memberships = await GroupMemberModel.find({ userId }).lean();
  const groupIds = memberships.map((membership) => membership.groupId);

  if (groupIds.length === 0) {
    return NextResponse.json([]);
  }

  const [groups, memberRows] = await Promise.all([
    GroupModel.find({ _id: { $in: groupIds } }).sort({ createdAt: -1 }).lean(),
    GroupMemberModel.find({ groupId: { $in: groupIds } }, { groupId: 1 }).lean(),
  ]);

  const memberCountByGroup = new Map<string, number>();
  for (const row of memberRows) {
    const key = row.groupId.toString();
    memberCountByGroup.set(key, (memberCountByGroup.get(key) || 0) + 1);
  }

  return NextResponse.json(
    groups.map((group) =>
      mobileGroupShape(group, memberCountByGroup.get(group._id.toString()) || 0),
    ),
  );
}

export async function POST(request: NextRequest) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string; visibility?: string };
  const name = String(body.name || "").trim();
  const visibility = body.visibility === "private" ? "private" : "public";
  if (!name) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const conn = await connectToDatabase();
  const ownerOid = new Types.ObjectId(userId);
  const inviteCode = generateInviteCode();
  const group = await GroupModel.create({
    name,
    description: "",
    ownerId: ownerOid,
    inviteCode,
  });

  await conn.connection.db!.collection("groups").updateOne(
    { _id: group._id },
    { $set: { visibility } },
  );

  await GroupMemberModel.create({ groupId: group._id, userId: ownerOid, role: "owner" });
  await getOrCreateActiveGroupInvite(group._id.toString(), userId, getJoinModeFromVisibility(visibility));
  await logMemberJoinedActivity({
    groupId: group._id,
    actorUserId: ownerOid,
    via: "group_created",
  });

  const refreshed = await GroupModel.findById(group._id).lean();
  if (!refreshed) {
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }

  return NextResponse.json({
    group: mobileGroupShape(refreshed, 1),
  });
}
