import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireApiUserId } from "@/lib/mobile-api";
import { GroupMemberModel } from "@/models/GroupMember";
import { MarketModel } from "@/models/Market";
import { getPrices } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const memberships = await GroupMemberModel.find({ userId }, { groupId: 1 }).lean();
  const groupIds = memberships.map((membership) => membership.groupId);

  if (groupIds.length === 0) {
    return NextResponse.json([]);
  }

  const markets = await MarketModel.find({ groupId: { $in: groupIds } })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json(
    markets.map((market) => {
      const prices = getPrices(market.yesShares, market.noShares);
      return {
        id: market._id.toString(),
        question: market.question,
        groupID: market.groupId.toString(),
        deadline: market.deadline.toISOString(),
        status: market.status,
        yesPrice: prices.yesPrice,
        noPrice: prices.noPrice,
      };
    }),
  );
}
