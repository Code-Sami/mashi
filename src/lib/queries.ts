import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { ensureSeedData } from "@/lib/seed";
import { serializeMarket } from "@/lib/serializers";
import { ActivityModel } from "@/models/Activity";
import { BetModel } from "@/models/Bet";
import { GroupModel } from "@/models/Group";
import { GroupMemberModel } from "@/models/GroupMember";
import { MarketModel } from "@/models/Market";
import { MarketPriceHistoryModel } from "@/models/MarketPriceHistory";
import { JoinRequestModel } from "@/models/JoinRequest";
import { UserModel } from "@/models/User";
import { ModerationLogModel } from "@/models/ModerationLog";
import { isEffectiveGroupOwner } from "@/lib/super-admin";

function fullName(user: {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  name?: string;
  email?: string;
  username?: string;
}) {
  const combined = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  if (combined) return combined;

  const base = (user.displayName || user.name || "").trim();
  if (base) {
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]} ${parts.slice(1).join(" ")}`;

    const fallbackLast =
      user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9]+/g, " ") ||
      user.username?.replace(/[^a-zA-Z0-9]+/g, " ") ||
      "Member";
    const cleanedLast = fallbackLast.trim().split(/\s+/)[0] || "Member";
    return `${parts[0]} ${cleanedLast}`;
  }

  return "Unknown user";
}

function fallbackUsername(user: {
  _id: { toString(): string };
  username?: string;
  email?: string;
  displayName?: string;
  name?: string;
}) {
  if (user.username && user.username.trim()) return user.username;
  const fromEmail = user.email?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (fromEmail) return fromEmail;
  const fromName = (user.displayName || user.name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (fromName) return fromName;
  return `user${user._id.toString().slice(-6)}`;
}

const MEMBER_JOIN_ACTIVITY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function getDashboardData(userId: string) {
  await connectToDatabase();
  await ensureSeedData();

  const memberships = await GroupMemberModel.find({ userId }).lean();
  const groupIds = memberships.map((membership) => membership.groupId);
  const groups = await GroupModel.find({ _id: { $in: groupIds } }).sort({ createdAt: -1 }).lean();
  const groupNameMap = new Map(groups.map((g) => [g._id.toString(), g.name]));
  const markets = await MarketModel.find({ groupId: { $in: groupIds } }).sort({ createdAt: -1 }).lean();
  const marketTitleMap = new Map(markets.map((m) => [m._id.toString(), m.question]));

  const taggedIds = [
    ...new Set(
      markets.flatMap((market) =>
        (((market.taggedUserIds || []) as Array<{ toString(): string }>).map((idObj) => idObj.toString()) || [])
      )
    ),
  ];
  const taggedUsers = taggedIds.length ? await UserModel.find({ _id: { $in: taggedIds } }).lean() : [];
  const taggedUserMap = new Map(taggedUsers.map((user) => [user._id.toString(), user]));

  const now = new Date();
  const openMarkets = markets.filter((m) => m.status === "open");

  const expiringMarkets = [...openMarkets]
    .filter((m) => new Date(m.deadline).getTime() > now.getTime())
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5)
    .map((m) => {
      const s = serializeMarket(m);
      return { ...s, groupName: groupNameMap.get(s.groupId) || "Unknown group", taggedUsers: (s.taggedUserIds || []).map((id) => ({ id, name: fullName(taggedUserMap.get(id) || {}) })) };
    });

  const newMarkets = [...openMarkets]
    .slice(0, 5)
    .map((m) => {
      const s = serializeMarket(m);
      return { ...s, groupName: groupNameMap.get(s.groupId) || "Unknown group", taggedUsers: (s.taggedUserIds || []).map((id) => ({ id, name: fullName(taggedUserMap.get(id) || {}) })) };
    });

  const activities = await ActivityModel.find({ groupId: { $in: groupIds } }).sort({ createdAt: -1 }).limit(15).lean();
  const actorIds = [...new Set(activities.map((a) => a.actorUserId.toString()))];
  const actorUsers = actorIds.length ? await UserModel.find({ _id: { $in: actorIds } }).lean() : [];
  const actorMap = new Map(actorUsers.map((u) => [u._id.toString(), u]));

  const friendActivity = activities.map((item) => ({
    id: item._id.toString(),
    type: item.type as string,
    actorUserId: item.actorUserId.toString(),
    actorName: fullName(actorMap.get(item.actorUserId.toString()) || {}),
    marketId: item.marketId?.toString() || null,
    marketTitle: item.marketId ? (marketTitleMap.get(item.marketId.toString()) || "a market") : null,
    groupName: groupNameMap.get(item.groupId.toString()) || "Unknown group",
    metadata: item.metadata || {},
    createdAt: item.createdAt?.toISOString() || null,
  }));

  const userBets = await BetModel.find({ userId }).sort({ createdAt: -1 }).lean();
  const betMarketIds = [...new Set(userBets.map((b) => b.marketId.toString()))];
  const betMarkets = betMarketIds.length ? await MarketModel.find({ _id: { $in: betMarketIds } }).lean() : [];
  const betMarketMap = new Map(betMarkets.map((m) => [m._id.toString(), m]));

  const resolvedBetMarkets = betMarkets.filter((m) => m.status === "resolved" && m.outcome);
  const resolvedMarketIds = resolvedBetMarkets.map((m) => m._id);
  const allResolvedBets = resolvedMarketIds.length
    ? await BetModel.find({ marketId: { $in: resolvedMarketIds } }).lean()
    : [];
  const poolsByMarket = new Map<string, { totalPool: number; winningPool: number; outcome: "yes" | "no" }>();
  for (const market of resolvedBetMarkets) {
    const mid = market._id.toString();
    const mBets = allResolvedBets.filter((b) => b.marketId.toString() === mid);
    const outcome = market.outcome as "yes" | "no";
    const totalPool = mBets.reduce((s, b) => s + (b.amount || 0), 0);
    const winningPool = mBets.filter((b) => b.side === outcome).reduce((s, b) => s + (b.amount || 0), 0);
    poolsByMarket.set(mid, { totalPool, winningPool, outcome });
  }

  let grossWinnings = 0;
  let totalStake = 0;
  const myResolvedBets: Array<{
    id: string;
    marketId: string;
    marketQuestion: string;
    side: string;
    amount: number;
    outcome: string;
    result: "win" | "loss";
    payout: number;
    pnl: number;
    createdAt: string | null;
  }> = [];

  for (const bet of userBets) {
    const mid = bet.marketId.toString();
    const pools = poolsByMarket.get(mid);
    if (!pools) continue;
    totalStake += bet.amount || 0;
    const isWin = bet.side === pools.outcome;
    const payout = isWin && pools.winningPool > 0 && pools.totalPool > 0
      ? ((bet.amount || 0) / pools.winningPool) * pools.totalPool
      : 0;
    if (isWin) grossWinnings += payout;
    myResolvedBets.push({
      id: bet._id.toString(),
      marketId: mid,
      marketQuestion: betMarketMap.get(mid)?.question || "Unknown market",
      side: bet.side,
      amount: bet.amount || 0,
      outcome: pools.outcome,
      result: isWin ? "win" : "loss",
      payout,
      pnl: payout - (bet.amount || 0),
      createdAt: bet.createdAt?.toISOString() || null,
    });
  }

  return {
    groups: groups.map((group) => ({
      id: group._id.toString(),
      name: group.name,
    })),
    stats: {
      totalBets: userBets.length,
      activeMarkets: openMarkets.length,
      grossWinnings,
      netPnL: grossWinnings - totalStake,
    },
    expiringMarkets,
    newMarkets,
    friendActivity,
    myResolvedBets: myResolvedBets.slice(0, 10),
  };
}

export async function getGroupsDirectoryData(userId: string) {
  await connectToDatabase();
  await ensureSeedData();

  const memberships = await GroupMemberModel.find({ userId }).lean();
  const myGroupIds = memberships.map((membership) => membership.groupId);
  const membershipSet = new Set(memberships.map((membership) => membership.groupId.toString()));
  const [myGroups, publicGroups] = await Promise.all([
    GroupModel.find({ _id: { $in: myGroupIds } }).sort({ createdAt: -1 }).lean(),
    GroupModel.find({
      visibility: "public",
      _id: { $nin: myGroupIds },
    }).sort({ createdAt: -1 }).lean(),
  ]);
  const allGroups = [...myGroups, ...publicGroups];
  const allMembers = await GroupMemberModel.find({
    groupId: { $in: allGroups.map((group) => group._id) },
  }).lean();
  const myPendingRequests = await JoinRequestModel.find({
    userId,
    status: "pending",
    groupId: { $in: allGroups.map((g) => g._id) },
  }).lean();
  const pendingSet = new Set(myPendingRequests.map((r) => r.groupId.toString()));

  const mapGroup = (group: (typeof allGroups)[number]) => ({
    id: group._id.toString(),
    name: group.name,
    visibility: (group.visibility || "public") as "public" | "private",
    memberCount: allMembers.filter((member) => member.groupId.toString() === group._id.toString()).length,
    isMember: membershipSet.has(group._id.toString()),
    hasPendingRequest: pendingSet.has(group._id.toString()),
  });

  return {
    myGroups: myGroups
      .map(mapGroup)
      .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name)),
    publicGroups: publicGroups
      .map(mapGroup)
      .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name)),
  };
}

export async function getMarketDetailData(marketId: string) {
  await connectToDatabase();
  await ensureSeedData();

  const market = await MarketModel.findById(marketId).lean();
  if (!market) {
    return null;
  }

  const group = await GroupModel.findById(market.groupId).lean();
  const umpire = await UserModel.findById(market.umpireId).lean();
  const bets = await BetModel.find({ marketId }).sort({ createdAt: 1 }).lean();
  const users = await UserModel.find().lean();
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));
  const history = await MarketPriceHistoryModel.find({ marketId }).sort({ createdAt: 1 }).lean();

  const betActivities = await ActivityModel.find({
    marketId,
    type: "bet_placed",
    "metadata.reasoning": { $exists: true, $ne: "" },
  }).lean();
  const reasoningByUserTime = new Map(
    betActivities.map((a) => [
      `${a.actorUserId.toString()}_${a.createdAt?.getTime() || 0}`,
      String(a.metadata?.reasoning || ""),
    ]),
  );

  const resolveActivity = await ActivityModel.findOne({
    marketId,
    type: "market_resolved",
    "metadata.evidence": { $exists: true, $ne: "" },
  }).lean();

  const createActivity = await ActivityModel.findOne({
    marketId,
    type: "market_created",
  }).lean();
  const creatorUser = createActivity ? userMap.get(createActivity.actorUserId.toString()) : null;

  return {
    market: serializeMarket(market),
    groupOwnerId: group?.ownerId?.toString() || null,
    groupName: group?.name || null,
    acceptedAt: (market as Record<string, unknown>).acceptedAt ? true : false,
    resolutionEvidence: resolveActivity?.metadata?.evidence
      ? String(resolveActivity.metadata.evidence)
      : null,
    creator: creatorUser
      ? {
          id: createActivity!.actorUserId.toString(),
          name: fullName(creatorUser),
        }
      : null,
    umpire: umpire
      ? {
          id: umpire._id.toString(),
          name: fullName(umpire),
          email: umpire.email,
        }
      : null,
    priceHistory: history.map((point) => ({
      id: point._id.toString(),
      yesPrice: point.yesPrice,
      noPrice: point.noPrice,
      totalVolume: point.totalVolume,
      createdAt: point.createdAt?.toISOString() || null,
    })),
    bets: bets.map((bet) => {
      const betTime = bet.createdAt?.getTime() || 0;
      const key = `${bet.userId.toString()}_${betTime}`;
      let reasoning = reasoningByUserTime.get(key) || "";
      if (!reasoning) {
        for (const [k, v] of reasoningByUserTime.entries()) {
          if (k.startsWith(bet.userId.toString()) && Math.abs(Number(k.split("_")[1]) - betTime) < 5000) {
            reasoning = v;
            break;
          }
        }
      }
      return {
        id: bet._id.toString(),
        marketId: bet.marketId.toString(),
        userId: bet.userId.toString(),
        side: bet.side,
        amount: bet.amount,
        payout: (bet as typeof bet & { payout?: number }).payout ?? 0,
        yesPriceAfter: bet.yesPriceAfter,
        noPriceAfter: bet.noPriceAfter,
        createdAt: bet.createdAt?.toISOString(),
        reasoning,
      };
    }),
    users: users.map((user) => ({
      id: user._id.toString(),
      name: fullName(user),
      email: user.email,
      username: user.username,
      isBot: Boolean(user.isBot),
    })),
    taggedUsers: ((market.taggedUserIds || []) as Array<{ toString(): string }>).map((idObj) => {
      const id = idObj.toString();
      const user = userMap.get(id);
      return {
        id,
        name: user ? fullName(user) : "Unknown user",
      };
    }),
    excludedUsers: ((market.excludedUserIds || []) as Array<{ toString(): string }>).map((idObj) => {
      const id = idObj.toString();
      const user = userMap.get(id);
      return {
        id,
        name: user ? fullName(user) : "Unknown user",
      };
    }),
  };
}

export async function getGroupPageData(groupId: string, userId?: string | null) {
  await connectToDatabase();
  await ensureSeedData();

  const group = await GroupModel.findById(groupId).lean();
  if (!group) return null;

  const isMember = userId ? Boolean(await GroupMemberModel.exists({ groupId, userId })) : false;
  const canViewContent = (group.visibility || "public") === "public" || isMember;

  if (!canViewContent) {
    const memberCount = await GroupMemberModel.countDocuments({ groupId });
    const myPendingRequest = userId
      ? Boolean(await JoinRequestModel.exists({ groupId, userId, status: "pending" }))
      : false;

    return {
      group: {
        id: group._id.toString(),
        name: group.name,
        visibility: (group.visibility || "public") as "public" | "private",
        ownerId: group.ownerId?.toString?.() || "",
        isMember,
        canViewContent,
        memberCount,
      },
      pendingRequests: [],
      myPendingRequest,
      members: [],
      activeMarkets: [],
      resolvedMarkets: [],
      moderationLogs: [],
      activity: [],
      leaderboard: [],
    };
  }

  const members = await GroupMemberModel.find({ groupId }).lean();
  const ownerMembership = members.find((member) => member.role === "owner");
  const fallbackOwnerId = ownerMembership?.userId?.toString() || members[0]?.userId?.toString() || "";
  const memberUsers = await UserModel.find({
    _id: { $in: members.map((member) => member.userId) },
  }).lean();
  const memberUserMap = new Map(memberUsers.map((user) => [user._id.toString(), user]));

  const markets = await MarketModel.find({ groupId }).sort({ createdAt: -1 }).lean();
  const marketTitleById = new Map(markets.map((market) => [market._id.toString(), market.question]));
  const activityRows = await ActivityModel.find({ groupId }).sort({ createdAt: -1 }).limit(100).lean();
  const memberJoinedSeen = new Map<string, number>();
  const activities = activityRows
    .filter((item) => {
      if (item.type !== "member_joined") return true;
      const actorId = item.actorUserId.toString();
      const createdAtMs = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      const lastSeenMs = memberJoinedSeen.get(actorId);
      if (typeof lastSeenMs === "number" && lastSeenMs - createdAtMs < MEMBER_JOIN_ACTIVITY_COOLDOWN_MS) {
        return false;
      }
      memberJoinedSeen.set(actorId, createdAtMs);
      return true;
    })
    .slice(0, 20);
  const activityActorIds = [...new Set(activities.map((item) => item.actorUserId.toString()))];
  const activityActors = await UserModel.find({ _id: { $in: activityActorIds } }).lean();
  const activityActorMap = new Map(activityActors.map((user) => [user._id.toString(), user]));
  const activeMarketIds = markets.filter((market) => market.status === "open").map((market) => market._id);
  const activeMarketHistory = await MarketPriceHistoryModel.find({
    marketId: { $in: activeMarketIds },
  })
    .sort({ createdAt: 1 })
    .lean();

  const bets = await BetModel.find({
    marketId: { $in: markets.map((market) => market._id) },
  }).lean();
  const resolvedMarkets = markets.filter((market) => market.status === "resolved" && market.outcome);
  const resolvedMarketMap = new Map(
    resolvedMarkets.map((market) => [market._id.toString(), market.outcome as "yes" | "no"]),
  );

  const poolByMarket = new Map<string, { totalPool: number; winningPool: number }>();
  for (const [marketId, outcome] of resolvedMarketMap.entries()) {
    const marketBets = bets.filter((bet) => bet.marketId.toString() === marketId);
    const totalPool = marketBets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
    const winningPool = marketBets
      .filter((bet) => bet.side === outcome)
      .reduce((sum, bet) => sum + (bet.amount || 0), 0);
    poolByMarket.set(marketId, { totalPool, winningPool });
  }

  const leaderboard = memberUsers
    .map((user) => {
      const userBets = bets.filter((bet) => bet.userId.toString() === user._id.toString());
      let grossWinnings = 0;
      let totalStaked = 0;
      for (const bet of userBets) {
        const marketId = bet.marketId.toString();
        const outcome = resolvedMarketMap.get(marketId);
        if (!outcome) continue;
        totalStaked += bet.amount;
        if (bet.side === outcome) {
          const pools = poolByMarket.get(marketId);
          if (pools && pools.winningPool > 0 && pools.totalPool > 0) {
            grossWinnings += (bet.amount / pools.winningPool) * pools.totalPool;
          }
        }
      }
      const netPnL = grossWinnings - totalStaked;
      return {
        userId: user._id.toString(),
        name: fullName(user),
        username: fallbackUsername(user),
        betsPlaced: userBets.length,
        netPnL,
        isBot: Boolean(user.isBot),
        botModel: (user.botModel as string) || null,
      };
    })
    .sort((a, b) => b.netPnL - a.netPnL || b.betsPlaced - a.betsPlaced);

  const priceHistoryByMarketId = new Map<string, number[]>();
  for (const point of activeMarketHistory) {
    const key = point.marketId.toString();
    const series = priceHistoryByMarketId.get(key) || [];
    series.push(point.yesPrice);
    priceHistoryByMarketId.set(key, series);
  }

  const actualOwnerId = group.ownerId?.toString?.() || fallbackOwnerId;
  const isOwner = userId ? isEffectiveGroupOwner(userId, actualOwnerId) : false;
  const pendingRequests = isOwner
    ? await (async () => {
        const reqs = await JoinRequestModel.find({ groupId, status: "pending" }).lean();
        if (reqs.length === 0) return [];
        const reqUserIds = reqs.map((r) => r.userId);
        const reqUsers = await UserModel.find({ _id: { $in: reqUserIds } }).lean();
        const reqUserMap = new Map(reqUsers.map((u) => [u._id.toString(), u]));
        return reqs.map((r) => ({
          id: r._id.toString(),
          userId: r.userId.toString(),
          name: fullName(reqUserMap.get(r.userId.toString()) || {}),
          avatarUrl: reqUserMap.get(r.userId.toString())?.avatarUrl || "",
          createdAt: r.createdAt?.toISOString() || null,
        }));
      })()
    : [];

  const myPendingRequest = userId && !isMember
    ? Boolean(await JoinRequestModel.exists({ groupId, userId, status: "pending" }))
    : false;

  const moderationLogs = isOwner
    ? await (async () => {
        const logs = await ModerationLogModel.find({ groupId, dismissedAt: null })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();
        if (logs.length === 0) return [];
        const logUserIds = [...new Set(logs.map((l) => l.userId.toString()))];
        const logUsers = await UserModel.find({ _id: { $in: logUserIds } }).lean();
        const logUserMap = new Map(logUsers.map((u) => [u._id.toString(), u]));
        return logs.map((l) => ({
          id: l._id.toString(),
          question: l.question,
          verdict: l.verdict as string,
          reason: l.reason,
          userName: fullName(logUserMap.get(l.userId.toString()) || {}),
          createdAt: l.createdAt?.toISOString() || null,
        }));
      })()
    : [];

  return {
    group: {
      id: group._id.toString(),
      name: group.name,
      visibility: (group.visibility || "public") as "public" | "private",
      ownerId: group.ownerId?.toString?.() || fallbackOwnerId,
      isMember,
      canViewContent,
    },
    pendingRequests,
    myPendingRequest,
    members: members.map((member) => {
      const user = memberUserMap.get(member.userId.toString());
      return {
        userId: member.userId.toString(),
        role: member.role,
        name: user ? fullName(user) : "Unknown",
        username: user ? fallbackUsername(user) : `user${member.userId.toString().slice(-6)}`,
        avatarUrl: user?.avatarUrl || "",
        isBot: Boolean(user?.isBot),
      };
    }).filter((member) => member.name !== "Unknown"),
    activeMarkets: markets
      .filter((market) => market.status === "open")
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .map((market) => ({
        ...serializeMarket(market),
        betCount: bets.filter((b) => b.marketId.toString() === market._id.toString()).length,
        priceHistory: priceHistoryByMarketId.get(market._id.toString()) || [],
      })),
    resolvedMarkets: markets
      .filter((market) => market.status === "resolved")
      .sort((a, b) => {
        const aTime = a.resolvedAt ? new Date(a.resolvedAt).getTime() : 0;
        const bTime = b.resolvedAt ? new Date(b.resolvedAt).getTime() : 0;
        return bTime - aTime;
      })
      .map((market) => ({
        ...serializeMarket(market),
        betCount: bets.filter((b) => b.marketId.toString() === market._id.toString()).length,
      })),
    moderationLogs,
    activity: activities.map((item) => {
      const actor = activityActorMap.get(item.actorUserId.toString());
      return {
        id: item._id.toString(),
        type: item.type,
        actorUserId: item.actorUserId.toString(),
        actorName:
          fullName(actor || {}) ||
          fallbackUsername(actor || { _id: item.actorUserId }),
        actorIsBot: Boolean(actor?.isBot),
        marketId: item.marketId ? item.marketId.toString() : null,
        marketTitle: item.marketId ? marketTitleById.get(item.marketId.toString()) || "this market" : null,
        metadata: item.metadata || {},
        createdAt: item.createdAt?.toISOString() || null,
      };
    }),
    leaderboard,
  };
}

export async function getPublicUserProfileData(userId: string, viewerUserId?: string | null) {
  await connectToDatabase();
  await ensureSeedData();

  const user = await UserModel.findById(userId).lean();
  if (!user) return null;

  const isSelfView = Boolean(viewerUserId && viewerUserId === userId);
  const viewerMembershipSet = new Set<string>();
  if (viewerUserId && !isSelfView) {
    const viewerMemberships = await GroupMemberModel.find({ userId: viewerUserId }, { groupId: 1 }).lean();
    viewerMemberships.forEach((m) => viewerMembershipSet.add(m.groupId.toString()));
  }

  const memberships = await GroupMemberModel.find({ userId }).sort({ createdAt: -1 }).lean();
  const groupIds = memberships.map((membership) => membership.groupId);
  const groups = await GroupModel.find({ _id: { $in: groupIds } }).lean();
  const groupMap = new Map(groups.map((group) => [group._id.toString(), group]));
  const visibleGroupIdSet = new Set(
    groups
      .filter((group) => {
        if (isSelfView) return true;
        if ((group.visibility || "public") === "public") return true;
        return viewerMembershipSet.has(group._id.toString());
      })
      .map((group) => group._id.toString()),
  );
  const visibleMemberships = memberships.filter((membership) =>
    visibleGroupIdSet.has(membership.groupId.toString()),
  );

  const createdMarketsAll = await MarketModel.find({ umpireId: userId }).sort({ createdAt: -1 }).lean();
  const createdMarkets = createdMarketsAll.filter((market) =>
    visibleGroupIdSet.has(market.groupId.toString()),
  );
  const createdMarketGroupIds = [...new Set(createdMarkets.map((market) => market.groupId.toString()))];
  const createdMarketGroups = await GroupModel.find({ _id: { $in: createdMarketGroupIds } }).lean();
  const createdMarketGroupMap = new Map(createdMarketGroups.map((group) => [group._id.toString(), group.name]));

  const userBetsAll = await BetModel.find({ userId }).sort({ createdAt: -1 }).lean();
  const betMarketIds = [...new Set(userBetsAll.map((bet) => bet.marketId.toString()))];
  const betMarketsAll = await MarketModel.find({ _id: { $in: betMarketIds } }).lean();
  const betMarkets = betMarketsAll.filter((market) =>
    visibleGroupIdSet.has(market.groupId.toString()),
  );
  const visibleBetMarketIdSet = new Set(betMarkets.map((market) => market._id.toString()));
  const userBets = userBetsAll.filter((bet) => visibleBetMarketIdSet.has(bet.marketId.toString()));
  const betMarketMap = new Map(betMarkets.map((market) => [market._id.toString(), market]));

  const resolvedBetMarkets = betMarkets.filter((market) => market.status === "resolved" && market.outcome);
  const poolsByMarket = new Map<string, { totalPool: number; winningPool: number; outcome: "yes" | "no" }>();
  const resolvedMarketIds = resolvedBetMarkets.map((market) => market._id);
  const allResolvedMarketBets = resolvedMarketIds.length
    ? await BetModel.find({ marketId: { $in: resolvedMarketIds } }).lean()
    : [];
  const betsByResolvedMarketId = new Map<string, typeof allResolvedMarketBets>();
  for (const marketBet of allResolvedMarketBets) {
    const key = marketBet.marketId.toString();
    const series = betsByResolvedMarketId.get(key) || [];
    series.push(marketBet);
    betsByResolvedMarketId.set(key, series);
  }

  for (const market of resolvedBetMarkets) {
    const marketId = market._id.toString();
    const marketBets = betsByResolvedMarketId.get(marketId) || [];
    const totalPool = marketBets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
    const outcome = market.outcome as "yes" | "no";
    const winningPool = marketBets
      .filter((bet) => bet.side === outcome)
      .reduce((sum, bet) => sum + (bet.amount || 0), 0);
    poolsByMarket.set(marketId, { totalPool, winningPool, outcome });
  }

  let grossWinnings = 0;
  let losses = 0;
  let resolvedBetCount = 0;
  let resolvedStake = 0;

  for (const bet of userBets) {
    const marketId = bet.marketId.toString();
    const pools = poolsByMarket.get(marketId);
    if (!pools) continue;

    resolvedBetCount += 1;
    resolvedStake += bet.amount || 0;
    if (bet.side === pools.outcome && pools.winningPool > 0 && pools.totalPool > 0) {
      grossWinnings += ((bet.amount || 0) / pools.winningPool) * pools.totalPool;
    } else {
      losses += bet.amount || 0;
    }
  }

  const activityAll = await ActivityModel.find({ actorUserId: userId }).sort({ createdAt: -1 }).limit(80).lean();
  const activity = activityAll.filter((item) => visibleGroupIdSet.has(item.groupId.toString())).slice(0, 40);
  const activityMarketIds = [...new Set(activity.map((item) => item.marketId?.toString()).filter(Boolean) as string[])];
  const activityGroupIds = [...new Set(activity.map((item) => item.groupId.toString()))];
  const activityMarkets = await MarketModel.find({ _id: { $in: activityMarketIds } }).lean();
  const activityGroups = await GroupModel.find({ _id: { $in: activityGroupIds } }).lean();
  const activityMarketMap = new Map(activityMarkets.map((market) => [market._id.toString(), market]));
  const activityGroupMap = new Map(activityGroups.map((group) => [group._id.toString(), group]));

  return {
    user: {
      id: user._id.toString(),
      name: fullName(user),
      email: user.email,
      avatarUrl: user.avatarUrl || "",
      initials: fullName(user)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join(""),
      joinedAt: user.createdAt?.toISOString() || null,
      isBot: Boolean(user.isBot),
      botProvider: (user.botProvider as string) || null,
      botModel: (user.botModel as string) || null,
    },
    groups: visibleMemberships.map((membership) => {
      const group = groupMap.get(membership.groupId.toString());
      return {
        id: membership.groupId.toString(),
        name: group?.name || "Unknown group",
        role: membership.role,
        joinedAt: membership.createdAt?.toISOString() || null,
      };
    }),
    stats: {
      betsPlaced: userBets.length,
      resolvedBets: resolvedBetCount,
      marketsCreated: createdMarkets.length,
      totalStake: userBets.reduce((sum, bet) => sum + (bet.amount || 0), 0),
      resolvedStake,
      grossWinnings,
      losses,
      net: grossWinnings - resolvedStake,
    },
    resolvedBets: userBets
      .map((bet) => {
        const marketId = bet.marketId.toString();
        const market = betMarketMap.get(marketId);
        const pools = poolsByMarket.get(marketId);
        if (!market || !pools) return null;
        const isWin = bet.side === pools.outcome;
        const payout = isWin && pools.winningPool > 0 && pools.totalPool > 0 ? ((bet.amount || 0) / pools.winningPool) * pools.totalPool : 0;
        return {
          id: bet._id.toString(),
          marketId,
          marketQuestion: market.question || "Unknown market",
          side: bet.side,
          amount: bet.amount || 0,
          outcome: pools.outcome,
          result: isWin ? "win" : "loss",
          payout,
          pnl: payout - (bet.amount || 0),
          createdAt: bet.createdAt?.toISOString() || null,
        };
      })
      .filter((bet): bet is NonNullable<typeof bet> => Boolean(bet))
      .slice(0, 20),
    recentCreations: createdMarkets.slice(0, 20).map((market) => ({
      id: market._id.toString(),
      question: market.question,
      status: market.status,
      outcome: market.outcome,
      createdAt: market.createdAt?.toISOString() || null,
      groupId: market.groupId.toString(),
      groupName: createdMarketGroupMap.get(market.groupId.toString()) || "Unknown group",
    })),
    activity: activity.map((item) => {
      const market = item.marketId ? activityMarketMap.get(item.marketId.toString()) : null;
      const group = activityGroupMap.get(item.groupId.toString());
      return {
        id: item._id.toString(),
        type: item.type,
        metadata: item.metadata || {},
        createdAt: item.createdAt?.toISOString() || null,
        marketId: item.marketId?.toString() || null,
        marketQuestion: market?.question || null,
        groupId: item.groupId.toString(),
        groupName: group?.name || "Unknown group",
      };
    }),
  };
}

export function toObjectId(id: string) {
  return new Types.ObjectId(id);
}
