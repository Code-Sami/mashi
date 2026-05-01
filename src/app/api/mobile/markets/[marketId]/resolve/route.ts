import { NextRequest, NextResponse } from "next/server";
import { requireApiUserId } from "@/lib/mobile-api";
import { connectToDatabase } from "@/lib/mongodb";
import { isEffectiveGroupOwner } from "@/lib/super-admin";
import { notifyMarketResolvedForBettors } from "@/lib/notifications";
import { ActivityModel } from "@/models/Activity";
import { BetModel } from "@/models/Bet";
import { GroupModel } from "@/models/Group";
import { MarketModel } from "@/models/Market";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ marketId: string }> },
) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { marketId } = await params;
  const body = (await request.json()) as { outcome?: string };
  const outcome = body.outcome;
  if (outcome !== "yes" && outcome !== "no") {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  await connectToDatabase();
  const market = await MarketModel.findById(marketId);
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });
  const group = await GroupModel.findById(market.groupId).lean();
  const isUmpire = market.umpireId.toString() === userId;
  const isOwner = Boolean(group && isEffectiveGroupOwner(userId, group.ownerId.toString()));
  if (!isUmpire && !isOwner) {
    return NextResponse.json({ error: "Only umpire or group owner can resolve" }, { status: 403 });
  }

  if (market.status !== "resolved") {
    market.status = "resolved";
    market.outcome = outcome;
    market.resolvedAt = new Date();
    await market.save();

    const bets = await BetModel.find({ marketId: market._id });
    const winningBets = bets.filter((bet) => bet.side === outcome);
    const winningPool = winningBets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalPool = bets.reduce((sum, bet) => sum + bet.amount, 0);

    await Promise.all(
      bets.map((bet) => {
        if (bet.side !== outcome || winningPool <= 0 || totalPool <= 0) {
          return BetModel.updateOne({ _id: bet._id }, { payout: 0 });
        }
        const payout = (bet.amount / winningPool) * totalPool;
        return BetModel.updateOne({ _id: bet._id }, { payout });
      }),
    );

    await ActivityModel.create({
      groupId: market.groupId,
      actorUserId: userId,
      type: "market_resolved",
      marketId: market._id,
      metadata: { outcome },
    });
    const uniqueBettorIds = [...new Set(bets.map((bet) => bet.userId.toString()))];
    await notifyMarketResolvedForBettors({
      marketId: market._id.toString(),
      groupId: market.groupId.toString(),
      actorUserId: userId,
      question: market.question,
      outcome,
      bettorUserIds: uniqueBettorIds,
    });
  }

  return NextResponse.json({ ok: true });
}
