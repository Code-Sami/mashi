import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { GroupModel } from "@/models/Group";
import { MarketModel } from "@/models/Market";
import { NotificationModel } from "@/models/Notification";
import { UserModel } from "@/models/User";

type NotificationType =
  | "market_tagged"
  | "umpire_assigned"
  | "umpire_market_expired"
  | "market_bet_resolved"
  | "group_join_request_submitted"
  | "group_join_request_approved";

type NotifyInput = {
  recipientUserId: string;
  actorUserId?: string | null;
  groupId?: string | null;
  marketId?: string | null;
  type: NotificationType;
  dedupeKey: string;
  payload?: Record<string, unknown>;
};

async function createNotification(input: NotifyInput) {
  await NotificationModel.updateOne(
    { dedupeKey: input.dedupeKey },
    {
      $setOnInsert: {
        recipientUserId: new Types.ObjectId(input.recipientUserId),
        actorUserId: input.actorUserId ? new Types.ObjectId(input.actorUserId) : null,
        groupId: input.groupId ? new Types.ObjectId(input.groupId) : null,
        marketId: input.marketId ? new Types.ObjectId(input.marketId) : null,
        type: input.type,
        payload: input.payload || {},
        dedupeKey: input.dedupeKey,
        readAt: null,
      },
    },
    { upsert: true }
  );
}

export async function notifyMarketCreated(params: {
  marketId: string;
  groupId: string;
  actorUserId: string;
  question: string;
  taggedUserIds: string[];
  umpireId: string;
}) {
  await connectToDatabase();
  const tasks: Array<Promise<unknown>> = [];

  for (const taggedUserId of params.taggedUserIds) {
    if (taggedUserId === params.actorUserId) continue;
    tasks.push(
      createNotification({
        recipientUserId: taggedUserId,
        actorUserId: params.actorUserId,
        groupId: params.groupId,
        marketId: params.marketId,
        type: "market_tagged",
        dedupeKey: `market_tagged:${params.marketId}:${taggedUserId}`,
        payload: { question: params.question },
      })
    );
  }

  if (params.umpireId !== params.actorUserId) {
    tasks.push(
      createNotification({
        recipientUserId: params.umpireId,
        actorUserId: params.actorUserId,
        groupId: params.groupId,
        marketId: params.marketId,
        type: "umpire_assigned",
        dedupeKey: `umpire_assigned:${params.marketId}:${params.umpireId}`,
        payload: { question: params.question },
      })
    );
  }

  await Promise.all(tasks);
}

export async function notifyJoinRequestSubmitted(params: {
  requestId: string;
  groupId: string;
  actorUserId: string;
}) {
  await connectToDatabase();
  const group = await GroupModel.findById(params.groupId, { ownerId: 1 }).lean();
  if (!group) return;
  const ownerId = group.ownerId.toString();
  if (ownerId === params.actorUserId) return;

  await createNotification({
    recipientUserId: ownerId,
    actorUserId: params.actorUserId,
    groupId: params.groupId,
    type: "group_join_request_submitted",
    dedupeKey: `group_join_request_submitted:${params.requestId}:${ownerId}`,
    payload: {},
  });
}

export async function notifyJoinRequestApproved(params: {
  requestId: string;
  groupId: string;
  actorUserId: string;
  recipientUserId: string;
}) {
  await connectToDatabase();
  await createNotification({
    recipientUserId: params.recipientUserId,
    actorUserId: params.actorUserId,
    groupId: params.groupId,
    type: "group_join_request_approved",
    dedupeKey: `group_join_request_approved:${params.requestId}:${params.recipientUserId}`,
    payload: {},
  });
}

export async function notifyMarketResolvedForBettors(params: {
  marketId: string;
  groupId: string;
  actorUserId: string;
  question: string;
  outcome: "yes" | "no";
  bettorUserIds: string[];
}) {
  await connectToDatabase();
  await Promise.all(
    [...new Set(params.bettorUserIds)].map((bettorUserId) =>
      createNotification({
        recipientUserId: bettorUserId,
        actorUserId: params.actorUserId,
        groupId: params.groupId,
        marketId: params.marketId,
        type: "market_bet_resolved",
        dedupeKey: `market_bet_resolved:${params.marketId}:${bettorUserId}`,
        payload: { question: params.question, outcome: params.outcome },
      })
    )
  );
}

export async function ensureExpiredUmpireNotificationsForUser(userId: string) {
  await connectToDatabase();
  const expiredMarkets = await MarketModel.find(
    {
      umpireId: userId,
      status: "open",
      deadline: { $lt: new Date() },
    },
    { _id: 1, groupId: 1, question: 1 }
  )
    .sort({ deadline: -1 })
    .limit(100)
    .lean();

  await Promise.all(
    expiredMarkets.map((market) =>
      createNotification({
        recipientUserId: userId,
        groupId: market.groupId.toString(),
        marketId: market._id.toString(),
        type: "umpire_market_expired",
        dedupeKey: `umpire_market_expired:${market._id.toString()}:${userId}`,
        payload: { question: market.question },
      })
    )
  );
}

function fullName(user: {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  name?: string;
}) {
  const explicit = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  if (explicit) return explicit;
  return (user.displayName || user.name || "").trim() || "Someone";
}

export async function getUnreadNotificationCount(userId: string) {
  await connectToDatabase();
  return NotificationModel.countDocuments({ recipientUserId: userId, readAt: null });
}

export async function getNotificationInbox(userId: string) {
  await connectToDatabase();
  const rows = await NotificationModel.find({ recipientUserId: userId })
    .sort({ readAt: 1, createdAt: -1 })
    .limit(100)
    .lean();
  const actorIds = [...new Set(rows.map((n) => n.actorUserId?.toString()).filter(Boolean) as string[])];
  const groupIds = [...new Set(rows.map((n) => n.groupId?.toString()).filter(Boolean) as string[])];
  const marketIds = [...new Set(rows.map((n) => n.marketId?.toString()).filter(Boolean) as string[])];

  const [actors, groups, markets] = await Promise.all([
    actorIds.length ? UserModel.find({ _id: { $in: actorIds } }).lean() : [],
    groupIds.length ? GroupModel.find({ _id: { $in: groupIds } }).lean() : [],
    marketIds.length ? MarketModel.find({ _id: { $in: marketIds } }).lean() : [],
  ]);
  const actorMap = new Map(actors.map((u) => [u._id.toString(), fullName(u)]));
  const groupMap = new Map(groups.map((g) => [g._id.toString(), g.name]));
  const marketMap = new Map(markets.map((m) => [m._id.toString(), m.question]));

  return rows.map((row) => {
    const actorName = row.actorUserId ? actorMap.get(row.actorUserId.toString()) || "Someone" : null;
    const groupName = row.groupId ? groupMap.get(row.groupId.toString()) || "Unknown group" : null;
    const marketQuestion = row.marketId ? marketMap.get(row.marketId.toString()) || "a market" : null;
    return {
      id: row._id.toString(),
      type: row.type as NotificationType,
      read: Boolean(row.readAt),
      readAt: row.readAt?.toISOString() || null,
      createdAt: row.createdAt?.toISOString() || null,
      actorName,
      groupName,
      groupId: row.groupId?.toString() || null,
      marketQuestion,
      marketId: row.marketId?.toString() || null,
      payload: row.payload || {},
    };
  });
}
