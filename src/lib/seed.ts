import "server-only";
import { ensureBotArena } from "@/lib/bot-arena";
import { connectToDatabase } from "@/lib/mongodb";
import { hash } from "bcryptjs";
import { getPrices } from "@/lib/market";
import { generateInviteCode } from "@/lib/utils";
import { ActivityModel } from "@/models/Activity";
import { BetModel } from "@/models/Bet";
import { GroupModel } from "@/models/Group";
import { GroupInviteModel } from "@/models/GroupInvite";
import { GroupMemberModel } from "@/models/GroupMember";
import { MarketModel } from "@/models/Market";
import { MarketPriceHistoryModel } from "@/models/MarketPriceHistory";
import { UserModel } from "@/models/User";

let hasSeeded = false;
const SEEDED_USER_DEFS = [
  { firstName: "Sam", lastName: "Karim", username: "sam", email: "sam@mashi.app" },
  { firstName: "Maya", lastName: "Lee", username: "maya", email: "maya@mashi.app" },
  { firstName: "Jordan", lastName: "Park", username: "jordan", email: "jordan@mashi.app" },
  { firstName: "Alex", lastName: "Moore", username: "alex", email: "alex@mashi.app" },
];

function splitLegacyName(name: string | undefined, email: string | undefined) {
  const raw = (name || "").trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Member";
  const fallbackLast = (email || "user@example.com").split("@")[0] || "User";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : fallbackLast;
  return { firstName, lastName };
}

function inferUsername(email: string, name: string, fallback: string) {
  const fromEmail = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (fromEmail) return fromEmail;
  const fromName = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (fromName) return fromName;
  return fallback;
}

export async function ensureSeedData() {
  if (hasSeeded) {
    return;
  }

  await connectToDatabase();
  const defaultHash = await hash("password123", 10);

  // Migrate legacy users to the new firstName/lastName schema.
  const legacyUsers = await UserModel.find({
    $or: [{ firstName: { $exists: false } }, { lastName: { $exists: false } }, { displayName: { $exists: false } }],
  });
  for (const legacy of legacyUsers) {
    const { firstName, lastName } = splitLegacyName(legacy.name, legacy.email);
    legacy.firstName = legacy.firstName || firstName;
    legacy.lastName = legacy.lastName || lastName;
    legacy.displayName = legacy.displayName || `${legacy.firstName} ${legacy.lastName}`.trim();
    legacy.name = legacy.name || legacy.displayName;
    legacy.username =
      legacy.username || inferUsername(legacy.email, legacy.displayName, `user${legacy._id.toString().slice(-6)}`);
    legacy.passwordHash = legacy.passwordHash || defaultHash;
    await legacy.save();
  }

  // Backfill visibility on groups created before the field existed.
  const conn = await connectToDatabase();
  await conn.connection.db!.collection("groups").updateMany(
    { visibility: { $exists: false } },
    { $set: { visibility: "public" } }
  );

  const users = [];
  for (const [index, def] of SEEDED_USER_DEFS.entries()) {
    const fullName = `${def.firstName} ${def.lastName}`.trim();
    const existing = await UserModel.findOne({ email: def.email });
    if (existing) {
      existing.name = existing.name || fullName;
      existing.firstName = existing.firstName || def.firstName;
      existing.lastName = existing.lastName || def.lastName;
      existing.displayName = existing.displayName || fullName;
      existing.username = existing.username || inferUsername(existing.email || def.email, existing.displayName || fullName, `${def.username}${index ? index : ""}`);
      existing.passwordHash = existing.passwordHash || defaultHash;
      await existing.save();
      users.push(existing);
      continue;
    }

    const created = await UserModel.create({
      name: fullName,
      firstName: def.firstName,
      lastName: def.lastName,
      username: def.username,
      displayName: fullName,
      email: def.email,
      passwordHash: defaultHash,
    });
    users.push(created);
  }

  let group = await GroupModel.findOne({ name: "Weekend Crew" });
  if (!group) {
    group = await GroupModel.create({
      name: "Weekend Crew",
      description: "",
      ownerId: users[0]._id,
      inviteCode: generateInviteCode(),
      visibility: "public",
    });
  } else {
    if (!group.ownerId) {
      group.ownerId = users[0]._id;
    }
    if (!group.inviteCode) {
      group.inviteCode = generateInviteCode();
    }
    await group.save();
  }

  const existingInvite = await GroupInviteModel.findOne({ groupId: group._id });
  if (!existingInvite) {
    await GroupInviteModel.create({
      groupId: group._id,
      code: group.inviteCode,
      createdById: users[0]._id,
      isActive: true,
    });
  }

  for (const [index, user] of users.entries()) {
    const role = index === 0 ? "owner" : "member";
    await GroupMemberModel.updateOne(
      { groupId: group._id, userId: user._id },
      { $set: { role } },
      { upsert: true }
    );
  }

  // Repair dangling memberships that reference deleted/non-existent users.
  const currentMembers = await GroupMemberModel.find({ groupId: group._id }).lean();
  const validUserIdSet = new Set(users.map((user) => user._id.toString()));
  const danglingMemberIds = currentMembers
    .filter((member) => !validUserIdSet.has(member.userId.toString()))
    .map((member) => member._id);
  if (danglingMemberIds.length > 0) {
    await GroupMemberModel.deleteMany({ _id: { $in: danglingMemberIds } });
  }

  const scenarios = [
    {
      question: "Will Maya finish a half marathon by July 1?",
      description: "",
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
      umpireId: users[0]._id,
      outcome: null,
      tradePlan: [
        { user: users[1], side: "yes", amount: 35 },
        { user: users[2], side: "no", amount: 20 },
        { user: users[3], side: "yes", amount: 40 },
        { user: users[2], side: "no", amount: 55 },
        { user: users[1], side: "yes", amount: 25 },
        { user: users[3], side: "no", amount: 15 },
        { user: users[1], side: "yes", amount: 30 },
        { user: users[2], side: "no", amount: 45 },
      ] as const,
    },
    {
      question: "Will Jordan cook dinner for everyone this weekend?",
      description: "",
      deadline: new Date(Date.now() - 1000 * 60 * 60 * 48),
      umpireId: users[0]._id,
      outcome: "yes" as const,
      tradePlan: [
        { user: users[0], side: "yes", amount: 25 },
        { user: users[1], side: "yes", amount: 40 },
        { user: users[2], side: "no", amount: 35 },
        { user: users[3], side: "yes", amount: 30 },
        { user: users[2], side: "no", amount: 20 },
      ] as const,
    },
    {
      question: "Will Alex be late to Saturday brunch?",
      description: "",
      deadline: new Date(Date.now() - 1000 * 60 * 60 * 72),
      umpireId: users[1]._id,
      outcome: "no" as const,
      tradePlan: [
        { user: users[0], side: "yes", amount: 20 },
        { user: users[1], side: "no", amount: 50 },
        { user: users[2], side: "no", amount: 30 },
        { user: users[3], side: "yes", amount: 35 },
        { user: users[1], side: "no", amount: 25 },
        { user: users[0], side: "yes", amount: 10 },
      ] as const,
    },
  ];

  for (const scenario of scenarios) {
    let market = await MarketModel.findOne({ groupId: group._id, question: scenario.question });
    if (!market) {
      market = await MarketModel.create({
        question: scenario.question,
        description: scenario.description,
        deadline: scenario.deadline,
        umpireId: scenario.umpireId,
        groupId: group._id,
        yesShares: 0,
        noShares: 0,
        totalVolume: 0,
        status: "open",
        outcome: null,
      });
      await ActivityModel.create({
        groupId: group._id,
        actorUserId: users[0]._id,
        type: "market_created",
        marketId: market._id,
        metadata: { question: market.question },
      });
    }

    const historyCount = await MarketPriceHistoryModel.countDocuments({ marketId: market._id });
    for (let i = historyCount; i < scenario.tradePlan.length; i += 1) {
      const step = scenario.tradePlan[i];
      if (step.side === "yes") market.yesShares += step.amount;
      else market.noShares += step.amount;
      market.totalVolume += step.amount;

      const prices = getPrices(market.yesShares, market.noShares);
      const bet = await BetModel.create({
        marketId: market._id,
        userId: step.user._id,
        side: step.side,
        amount: step.amount,
        yesPriceAfter: prices.yesPrice,
        noPriceAfter: prices.noPrice,
      });
      await MarketPriceHistoryModel.create({
        marketId: market._id,
        yesPrice: prices.yesPrice,
        noPrice: prices.noPrice,
        totalVolume: market.totalVolume,
        source: "seed",
      });
      await ActivityModel.create({
        groupId: group._id,
        actorUserId: step.user._id,
        type: "bet_placed",
        marketId: market._id,
        metadata: { side: bet.side, amount: bet.amount },
      });
    }

    if (scenario.outcome) {
      market.status = "resolved";
      market.outcome = scenario.outcome;
      market.resolvedAt = market.resolvedAt || new Date();

      // Recompute payouts every run so legacy resolved markets get winnings backfilled.
      const bets = await BetModel.find({ marketId: market._id });
      const winningBets = bets.filter((bet) => bet.side === scenario.outcome);
      const winningPool = winningBets.reduce((sum, bet) => sum + bet.amount, 0);
      const totalPool = bets.reduce((sum, bet) => sum + bet.amount, 0);
      for (const bet of bets) {
        const payout =
          bet.side === scenario.outcome && winningPool > 0
            ? (bet.amount / winningPool) * totalPool
            : 0;
        await BetModel.updateOne({ _id: bet._id }, { payout });
      }

      const resolutionActivity = await ActivityModel.findOne({
        groupId: group._id,
        type: "market_resolved",
        marketId: market._id,
      });
      if (!resolutionActivity) {
        await ActivityModel.create({
          groupId: group._id,
          actorUserId: scenario.umpireId,
          type: "market_resolved",
          marketId: market._id,
          metadata: { outcome: scenario.outcome },
        });
      }
    }

    await market.save();
  }

  await ensureBotArena();

  hasSeeded = true;
}
