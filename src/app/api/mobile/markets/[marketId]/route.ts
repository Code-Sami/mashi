import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireApiUserId, fullName } from "@/lib/mobile-api";
import { serializeMarket } from "@/lib/serializers";
import { isEffectiveGroupOwner } from "@/lib/super-admin";
import { BetModel } from "@/models/Bet";
import { GroupMemberModel } from "@/models/GroupMember";
import { GroupModel } from "@/models/Group";
import { MarketModel } from "@/models/Market";
import { MarketPriceHistoryModel } from "@/models/MarketPriceHistory";
import { UserModel } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ marketId: string }> },
) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { marketId } = await params;
  await connectToDatabase();

  const market = await MarketModel.findById(marketId).lean();
  if (!market) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isMember = await GroupMemberModel.exists({ groupId: market.groupId, userId });
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [group, history, bets] = await Promise.all([
    GroupModel.findById(market.groupId).lean(),
    MarketPriceHistoryModel.find({ marketId }).sort({ createdAt: 1 }).lean(),
    BetModel.find({ marketId }).sort({ createdAt: -1 }).limit(40).lean(),
  ]);

  const userIds = [...new Set(bets.map((b) => b.userId.toString()))];
  const users = userIds.length ? await UserModel.find({ _id: { $in: userIds } }).lean() : [];
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const serialized = serializeMarket(market);
  const canResolve = Boolean(
    market.umpireId?.toString() === userId ||
      (group && isEffectiveGroupOwner(userId, group.ownerId.toString())),
  );

  return NextResponse.json({
    market: {
      id: serialized.id,
      question: serialized.question,
      groupID: serialized.groupId,
      deadline: serialized.deadline,
      status: serialized.status,
      outcome: serialized.outcome,
      yesPrice: serialized.yesPrice,
      noPrice: serialized.noPrice,
      totalVolume: serialized.totalVolume,
      umpireID: serialized.umpireId,
      canResolve,
    },
    history: history.map((p) => ({
      id: p._id.toString(),
      yesPrice: p.yesPrice,
      noPrice: p.noPrice,
      totalVolume: p.totalVolume,
      createdAt: p.createdAt?.toISOString() || null,
    })),
    recentBets: bets.map((b) => ({
      id: b._id.toString(),
      userID: b.userId.toString(),
      userName: fullName(userMap.get(b.userId.toString()) || {}),
      side: b.side,
      amount: b.amount,
      createdAt: b.createdAt?.toISOString() || null,
    })),
  });
}
