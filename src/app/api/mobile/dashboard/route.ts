import { NextRequest, NextResponse } from "next/server";
import { requireApiUserId } from "@/lib/mobile-api";
import { getDashboardData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dashboard = await getDashboardData(userId);
  const dayAgoMs = Date.now() - 24 * 60 * 60 * 1000;
  return NextResponse.json({
    stats: dashboard.stats,
    expiringSoon: dashboard.expiringMarkets.map((market) => ({
      id: market.id,
      question: market.question,
      groupID: market.groupId,
      deadline: market.deadline,
      status: market.status,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
    })),
    newMarkets: dashboard.newMarkets
      .filter((market) => {
        const createdAtMs = market.createdAt ? Date.parse(market.createdAt) : 0;
        return createdAtMs >= dayAgoMs;
      })
      .map((market) => ({
        id: market.id,
        question: market.question,
        groupID: market.groupId,
        deadline: market.deadline,
        status: market.status,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
      })),
    friendActivity: dashboard.friendActivity.map((item) => ({
      id: item.id,
      type: item.type,
      actorUserID: item.actorUserId,
      actorName: item.actorName,
      marketID: item.marketId,
      marketQuestion: item.marketTitle,
      summary: formatActivitySummary(item.type, item.marketTitle, item.metadata || {}),
      createdAt: item.createdAt,
    })),
    recentResolvedBets: dashboard.myResolvedBets.map((bet) => ({
      id: bet.id,
      marketID: bet.marketId,
      marketQuestion: bet.marketQuestion,
      result: bet.result,
      pnl: bet.pnl,
      createdAt: bet.createdAt,
    })),
  });
}

function formatActivitySummary(
  type: string,
  marketTitle: string | null,
  metadata: Record<string, unknown>,
) {
  if (type === "bet_placed") {
    const side = String(metadata.side || "").toUpperCase();
    const amount = Number(metadata.amount || 0);
    if (side && amount > 0 && marketTitle) return `Bet $${amount} on ${side} • ${marketTitle}`;
    return "Placed a bet";
  }
  if (type === "market_created") {
    return marketTitle ? `Created: ${marketTitle}` : "Created a market";
  }
  if (type === "market_resolved") {
    const outcome = String(metadata.outcome || "").toUpperCase();
    return outcome && marketTitle ? `Resolved ${outcome} • ${marketTitle}` : "Resolved a market";
  }
  if (type === "member_joined") {
    return "Joined the group";
  }
  return "Activity update";
}
