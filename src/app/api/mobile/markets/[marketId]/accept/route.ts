import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireApiUserId } from "@/lib/mobile-api";
import { connectToDatabase } from "@/lib/mongodb";
import { isEffectiveGroupOwner } from "@/lib/super-admin";
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
    return NextResponse.json({ error: "Only group owner can accept" }, { status: 403 });
  }

  await MarketModel.collection.updateOne(
    { _id: new Types.ObjectId(marketId) },
    { $set: { acceptedAt: new Date() } },
  );
  return NextResponse.json({ ok: true });
}
