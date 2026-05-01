import { Types } from "mongoose";
import { ActivityModel } from "@/models/Activity";

const MEMBER_JOIN_ACTIVITY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function logMemberJoinedActivity(params: {
  groupId: Types.ObjectId;
  actorUserId: Types.ObjectId;
  via: string;
}) {
  const recentThreshold = new Date(Date.now() - MEMBER_JOIN_ACTIVITY_COOLDOWN_MS);
  const hasRecentJoinLog = await ActivityModel.exists({
    groupId: params.groupId,
    actorUserId: params.actorUserId,
    type: "member_joined",
    createdAt: { $gte: recentThreshold },
  });
  if (hasRecentJoinLog) return;

  await ActivityModel.create({
    groupId: params.groupId,
    actorUserId: params.actorUserId,
    type: "member_joined",
    metadata: { via: params.via },
  });
}
