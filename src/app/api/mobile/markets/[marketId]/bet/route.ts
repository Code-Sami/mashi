import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireApiUserId } from "@/lib/mobile-api";
import { connectToDatabase } from "@/lib/mongodb";
import { getPrices } from "@/lib/market";
import { ActivityModel } from "@/models/Activity";
import { BetModel } from "@/models/Bet";
import { GroupMemberModel } from "@/models/GroupMember";
import { GroupModel } from "@/models/Group";
import { MarketModel } from "@/models/Market";
import { MarketPriceHistoryModel } from "@/models/MarketPriceHistory";
import { UserModel } from "@/models/User";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ marketId: string }> },
) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { marketId } = await params;
  const payload = (await request.json()) as { side?: string; amount?: number };
  const side = payload.side;
  const amount = Number(payload.amount || 0);

  if (!marketId || (side !== "yes" && side !== "no") || amount <= 0 || amount > 100) {
    return NextResponse.json({ error: "Invalid bet payload" }, { status: 400 });
  }

  await connectToDatabase();
  const market = await MarketModel.findById(marketId);
  if (!market || market.status !== "open") {
    return NextResponse.json({ error: "Market is closed" }, { status: 400 });
  }
  if (new Date(market.deadline).getTime() < Date.now()) {
    return NextResponse.json({ error: "Market is closed" }, { status: 400 });
  }

  const isMember = await GroupMemberModel.exists({
    groupId: market.groupId,
    userId: new Types.ObjectId(userId),
  });
  if (!isMember) {
    return NextResponse.json({ error: "You are not a group member" }, { status: 403 });
  }

  const group = await GroupModel.findById(market.groupId).lean();
  const isBotGroup = group?.name === "LLM Arena";
  const user = await UserModel.findById(userId).lean();
  if (isBotGroup && !user?.isBot) {
    return NextResponse.json({ error: "Only bots can bet in this market" }, { status: 403 });
  }

  const isExcluded = ((market.excludedUserIds || []) as Array<{ toString(): string }>)
    .some((id) => id.toString() === userId);
  if (isExcluded) {
    return NextResponse.json({ error: "You are excluded from this market" }, { status: 403 });
  }

  if (side === "yes") market.yesShares += amount;
  else market.noShares += amount;
  market.totalVolume += amount;
  const prices = getPrices(market.yesShares, market.noShares);
  await market.save();

  await BetModel.create({
    marketId: market._id,
    userId: new Types.ObjectId(userId),
    side,
    amount,
    yesPriceAfter: prices.yesPrice,
    noPriceAfter: prices.noPrice,
  });
  await MarketPriceHistoryModel.create({
    marketId: market._id,
    yesPrice: prices.yesPrice,
    noPrice: prices.noPrice,
    totalVolume: market.totalVolume,
    source: "bet",
  });
  await ActivityModel.create({
    groupId: market.groupId,
    actorUserId: new Types.ObjectId(userId),
    type: "bet_placed",
    marketId: market._id,
    metadata: { side, amount },
  });

  return NextResponse.json({
    ok: true,
    market: {
      id: market._id.toString(),
      question: market.question,
      groupID: market.groupId.toString(),
      deadline: market.deadline,
      status: market.status,
      yesPrice: prices.yesPrice,
      noPrice: prices.noPrice,
    },
  });
}
