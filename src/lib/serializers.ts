import { getPrices } from "@/lib/market";

export function serializeMarket(market: {
  _id: { toString(): string };
  groupId: { toString(): string };
  umpireId: { toString(): string };
  taggedUserIds?: Array<{ toString(): string }>;
  excludedUserIds?: Array<{ toString(): string }>;
  question: string;
  description?: string;
  deadline: Date;
  yesShares: number;
  noShares: number;
  totalVolume: number;
  status: "open" | "resolved";
  outcome: "yes" | "no" | null;
  createdAt?: Date;
  resolvedAt?: Date | null;
}) {
  const prices = getPrices(market.yesShares, market.noShares);
  return {
    id: market._id.toString(),
    groupId: market.groupId.toString(),
    umpireId: market.umpireId.toString(),
    taggedUserIds: (market.taggedUserIds || []).map((id) => id.toString()),
    excludedUserIds: (market.excludedUserIds || []).map((id) => id.toString()),
    question: market.question,
    description: market.description || "",
    deadline: market.deadline.toISOString(),
    yesShares: market.yesShares,
    noShares: market.noShares,
    totalVolume: market.totalVolume,
    status: market.status,
    outcome: market.outcome,
    yesPrice: prices.yesPrice,
    noPrice: prices.noPrice,
    createdAt: market.createdAt?.toISOString(),
    resolvedAt: market.resolvedAt?.toISOString() || null,
  };
}
