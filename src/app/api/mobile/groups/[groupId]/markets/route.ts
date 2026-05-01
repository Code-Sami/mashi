import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { moderateQuestion } from "@/lib/moderation";
import { requireApiUserId } from "@/lib/mobile-api";
import { notifyMarketCreated } from "@/lib/notifications";
import { serializeMarket } from "@/lib/serializers";
import { ActivityModel } from "@/models/Activity";
import { GroupMemberModel } from "@/models/GroupMember";
import { MarketModel } from "@/models/Market";
import { MarketPriceHistoryModel } from "@/models/MarketPriceHistory";
import { ModerationLogModel } from "@/models/ModerationLog";
import { GroupModel } from "@/models/Group";
import { isEffectiveGroupOwner } from "@/lib/super-admin";

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
  const body = (await request.json()) as { question?: string; deadline?: string };
  const question = String(body.question || "").trim();
  const deadlineRaw = body.deadline ? String(body.deadline) : "";
  if (!groupId || !question || !deadlineRaw) {
    return NextResponse.json({ error: "question and deadline are required" }, { status: 400 });
  }

  const deadline = new Date(deadlineRaw);
  if (Number.isNaN(deadline.getTime())) {
    return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
  }

  await connectToDatabase();
  const groupOid = new Types.ObjectId(groupId);
  const userOid = new Types.ObjectId(userId);

  const membership = await GroupMemberModel.findOne({ groupId: groupOid, userId: userOid }).lean();
  if (!membership) {
    return NextResponse.json({ error: "You are not in this group" }, { status: 403 });
  }

  const moderation = await moderateQuestion(question);
  if (!moderation.allowed) {
    const groupMeta = await GroupModel.findById(groupOid).select("ownerId").lean();
    const isOwner = !!(
      groupMeta &&
      isEffectiveGroupOwner(userId, groupMeta.ownerId?.toString() || "")
    );
    await ModerationLogModel.create({
      groupId: groupOid,
      userId: userOid,
      question,
      verdict: "rejected",
      reason: moderation.reason,
    });
    return NextResponse.json(
      {
        error: "Question was not approved",
        reason: moderation.reason,
        canOverride: isOwner,
      },
      { status: 422 },
    );
  }

  const market = await MarketModel.create({
    question,
    description: "",
    deadline,
    umpireId: userOid,
    groupId: groupOid,
    taggedUserIds: [],
    excludedUserIds: [],
    yesShares: 0,
    noShares: 0,
    totalVolume: 0,
    status: "open",
    outcome: null,
  });

  await ActivityModel.create({
    groupId: groupOid,
    actorUserId: userOid,
    type: "market_created",
    marketId: market._id,
    metadata: {
      question,
      taggedUserIds: [],
      excludedUserIds: [],
    },
  });
  await MarketPriceHistoryModel.create({
    marketId: market._id,
    yesPrice: 0.5,
    noPrice: 0.5,
    totalVolume: 0,
    source: "seed",
  });
  await notifyMarketCreated({
    marketId: market._id.toString(),
    groupId,
    actorUserId: userId,
    question,
    taggedUserIds: [],
    umpireId: userId,
  });

  const lean = await MarketModel.findById(market._id).lean();
  if (!lean) {
    return NextResponse.json({ error: "Market creation failed" }, { status: 500 });
  }
  const s = serializeMarket(lean);
  return NextResponse.json({
    market: {
      id: s.id,
      question: s.question,
      groupID: s.groupId,
      deadline: s.deadline,
      status: s.status,
      yesPrice: s.yesPrice,
      noPrice: s.noPrice,
    },
  });
}
