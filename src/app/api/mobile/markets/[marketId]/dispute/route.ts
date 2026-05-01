import { NextRequest, NextResponse } from "next/server";
import { requireApiUserId } from "@/lib/mobile-api";
import { connectToDatabase } from "@/lib/mongodb";
import { isEffectiveGroupOwner } from "@/lib/super-admin";
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
  await connectToDatabase();
  const market = await MarketModel.findById(marketId);
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });
  if (market.status !== "resolved") {
    return NextResponse.json({ error: "Market is not resolved" }, { status: 400 });
  }

  const group = await GroupModel.findById(market.groupId).lean();
  if (!group || !isEffectiveGroupOwner(userId, group.ownerId.toString())) {
    return NextResponse.json({ error: "Only group owner can dispute" }, { status: 403 });
  }

  market.status = "open";
  market.outcome = null;
  market.resolvedAt = null;
  await market.save();
  await BetModel.updateMany({ marketId: market._id }, { $unset: { payout: "" } });
  await ActivityModel.deleteMany({ marketId: market._id, type: "market_resolved" });

  return NextResponse.json({ ok: true });
}
