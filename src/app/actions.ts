"use server";

import { hash } from "bcryptjs";
import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { getPrices } from "@/lib/market";
import { ensureSeedData } from "@/lib/seed";
import { requireAuthUser } from "@/lib/session";
import { ActivityModel } from "@/models/Activity";
import { BetModel } from "@/models/Bet";
import { GroupModel } from "@/models/Group";
import { GroupMemberModel } from "@/models/GroupMember";
import { MarketModel } from "@/models/Market";
import { MarketPriceHistoryModel } from "@/models/MarketPriceHistory";
import { JoinRequestModel } from "@/models/JoinRequest";
import { UserModel } from "@/models/User";

function toBaseUsername(displayName: string, email: string) {
  const fromName = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  if (fromName.length >= 3) return fromName;
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "user";
}

async function generateUniqueUsername(displayName: string, email: string) {
  const base = toBaseUsername(displayName, email);
  let candidate = base;
  let count = 1;

  // Keep probing until we find a free username.
  while (await UserModel.exists({ username: candidate })) {
    candidate = `${base}${count}`;
    count += 1;
  }

  return candidate;
}

function parseUserIdList(formData: FormData, field: string) {
  return [...new Set(formData.getAll(field).map((value) => value.toString()).filter(Boolean))];
}

export async function signupAction(formData: FormData) {
  const firstName = formData.get("firstName")?.toString().trim() || "";
  const lastName = formData.get("lastName")?.toString().trim() || "";
  const displayName = `${firstName} ${lastName}`.trim();
  const email = formData.get("email")?.toString().trim().toLowerCase() || "";
  const password = formData.get("password")?.toString() || "";

  if (!firstName || !lastName || !email || !password || password.length < 8) {
    redirect("/signup?error=invalid");
  }

  const conn = await connectToDatabase();
  const usersCollection = conn.connection.db!.collection("users");
  const passwordHash = await hash(password, 10);

  const existingByEmail = await usersCollection.findOne({ email });
  if (existingByEmail) {
    // Repair legacy/stale-model user rows that were created without credentials.
    if (!existingByEmail.passwordHash || !existingByEmail.username || !existingByEmail.displayName) {
      const username = await generateUniqueUsername(displayName, email);
      await usersCollection.updateOne(
        { _id: existingByEmail._id },
        {
          $set: {
            name: displayName,
            firstName,
            lastName,
            displayName,
            username,
            passwordHash,
            updatedAt: new Date(),
          },
        }
      );
      redirect("/login?created=1");
    }
    redirect("/signup?error=taken");
  }

  const username = await generateUniqueUsername(displayName, email);
  await usersCollection.insertOne({
    name: displayName,
    firstName,
    lastName,
    username,
    displayName,
    email,
    passwordHash,
    avatarUrl: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  redirect("/login?created=1");
}

export async function createGroupAction(formData: FormData) {
  const user = await requireAuthUser();
  await connectToDatabase();
  await ensureSeedData();

  const name = formData.get("name")?.toString().trim() || "";
  if (!name) throw new Error("Group name is required.");

  const publicCode = `PUBLIC-${Date.now().toString(36).toUpperCase()}`;
  const group = await GroupModel.create({
    name,
    description: "",
    ownerId: user._id,
    inviteCode: publicCode,
  });

  await GroupMemberModel.create({ groupId: group._id, userId: user._id, role: "owner" });
  await ActivityModel.create({
    groupId: group._id,
    actorUserId: user._id,
    type: "member_joined",
    metadata: { via: "group_created" },
  });

  revalidatePath("/groups");
  redirect(`/groups/${group._id.toString()}`);
}

export async function joinGroupAction(formData: FormData) {
  const user = await requireAuthUser();
  await connectToDatabase();
  const groupId = formData.get("groupId")?.toString() || "";
  if (!groupId) throw new Error("Group id is required.");

  const group = await GroupModel.findById(groupId).lean();
  if (!group) throw new Error("Group not found.");
  if ((group as Record<string, unknown>).visibility === "private") {
    redirect(`/groups/${groupId}?error=private_group`);
  }

  const existing = await GroupMemberModel.findOne({ groupId, userId: user._id });
  if (!existing) {
    await GroupMemberModel.create({ groupId, userId: user._id, role: "member" });
    await ActivityModel.create({
      groupId,
      actorUserId: user._id,
      type: "member_joined",
      metadata: { via: "public_group" },
    });
  }

  revalidatePath("/groups");
  redirect(`/groups/${groupId}`);
}

export async function leaveGroupAction(formData: FormData) {
  const user = await requireAuthUser();
  const groupId = formData.get("groupId")?.toString() || "";
  await connectToDatabase();
  const group = await GroupModel.findById(groupId).lean();
  if (!group) return;
  if (group.ownerId.toString() === user._id.toString()) {
    throw new Error("Owner cannot leave the group.");
  }
  await GroupMemberModel.deleteOne({ groupId, userId: user._id });
  revalidatePath("/groups");
  redirect("/groups");
}

export async function createMarketAction(formData: FormData) {
  const user = await requireAuthUser();
  const groupId = formData.get("groupId")?.toString() || "";
  const question = formData.get("question")?.toString().trim() || "";
  const deadline = formData.get("deadline")?.toString() || "";
  const umpireId = formData.get("umpireId")?.toString() || user._id.toString();
  const taggedUserIds = parseUserIdList(formData, "taggedUserIds");
  const excludeTaggedUsers = formData.get("excludeTaggedUsers")?.toString() === "on";
  const excludeUmpire = formData.get("excludeUmpire")?.toString() === "on";
  if (!groupId || !question || !deadline) throw new Error("Missing market fields.");

  await connectToDatabase();
  const groupMemberships = await GroupMemberModel.find({ groupId }).lean();
  const membership = groupMemberships.find((member) => member.userId.toString() === user._id.toString());
  if (!membership) throw new Error("You are not in this group.");
  const validMemberIds = new Set(groupMemberships.map((member) => member.userId.toString()));

  const normalizedTagged = [...new Set(taggedUserIds)].filter((id) => validMemberIds.has(id));
  const computedExcluded = new Set<string>();
  if (excludeTaggedUsers) normalizedTagged.forEach((id) => computedExcluded.add(id));
  if (excludeUmpire && validMemberIds.has(umpireId)) computedExcluded.add(umpireId);

  const market = await MarketModel.create({
    question,
    description: "",
    deadline: new Date(deadline),
    umpireId,
    groupId,
    taggedUserIds: normalizedTagged,
    excludedUserIds: [...computedExcluded],
    yesShares: 0,
    noShares: 0,
    totalVolume: 0,
    status: "open",
    outcome: null,
  });
  await ActivityModel.create({
    groupId,
    actorUserId: user._id,
    type: "market_created",
    marketId: market._id,
    metadata: {
      question,
      taggedUserIds: normalizedTagged,
      excludedUserIds: [...computedExcluded],
    },
  });
  await MarketPriceHistoryModel.create({
    marketId: market._id,
    yesPrice: 0.5,
    noPrice: 0.5,
    totalVolume: 0,
    source: "seed",
  });
  revalidatePath(`/groups/${groupId}`);
  redirect(`/markets/${market._id.toString()}`);
}

export async function placeBetAction(formData: FormData) {
  const user = await requireAuthUser();
  const marketId = formData.get("marketId")?.toString() || "";
  const side = formData.get("side")?.toString() || "";
  const amount = Number(formData.get("amount")?.toString() || 0);
  if (!marketId || (side !== "yes" && side !== "no") || amount <= 0) {
    redirect(`/markets/${marketId}?error=invalid_bet`);
  }
  await connectToDatabase();

  const market = await MarketModel.findById(marketId);
  if (!market || market.status !== "open") redirect(`/markets/${marketId}?error=market_closed`);
  if (new Date(market.deadline).getTime() < Date.now()) redirect(`/markets/${marketId}?error=market_closed`);

  const isMember = await GroupMemberModel.exists({ groupId: market.groupId, userId: user._id });
  if (!isMember) redirect(`/markets/${marketId}?error=not_member`);
  const isExcluded = ((market.excludedUserIds || []) as Array<{ toString(): string }>).some(
    (id) => id.toString() === user._id.toString()
  );
  if (isExcluded) redirect(`/markets/${marketId}?error=excluded_user`);

  if (side === "yes") market.yesShares += amount;
  else market.noShares += amount;
  market.totalVolume += amount;
  const prices = getPrices(market.yesShares, market.noShares);
  await market.save();

  await BetModel.create({
    marketId: market._id,
    userId: user._id,
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
    actorUserId: user._id,
    type: "bet_placed",
    marketId: market._id,
    metadata: { side, amount },
  });

  revalidatePath(`/markets/${market._id.toString()}`);
  revalidatePath(`/groups/${market.groupId.toString()}`);
}

export async function resolveMarketAction(formData: FormData) {
  const user = await requireAuthUser();
  const marketId = formData.get("marketId")?.toString() || "";
  const outcome = formData.get("outcome")?.toString();
  if (!marketId || (outcome !== "yes" && outcome !== "no")) throw new Error("Invalid resolution.");

  await connectToDatabase();
  const market = await MarketModel.findById(marketId);
  if (!market) throw new Error("Market not found.");
  if (market.umpireId.toString() !== user._id.toString()) throw new Error("Only umpire can resolve.");
  if (market.status === "resolved") return;

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

      // Pari-mutuel settlement: winners split the total pool pro-rata by winning stake.
      const payout = (bet.amount / winningPool) * totalPool;
      return BetModel.updateOne({ _id: bet._id }, { payout });
    })
  );
  await ActivityModel.create({
    groupId: market.groupId,
    actorUserId: user._id,
    type: "market_resolved",
    marketId: market._id,
    metadata: { outcome },
  });

  revalidatePath(`/markets/${market._id.toString()}`);
  revalidatePath(`/groups/${market.groupId.toString()}`);
}

export async function updateGroupAction(formData: FormData) {
  const user = await requireAuthUser();
  const groupId = formData.get("groupId")?.toString() || "";
  const name = formData.get("name")?.toString().trim() || "";
  const visibility = formData.get("visibility")?.toString() || "public";
  if (!groupId || !name) throw new Error("Group name is required.");
  if (visibility !== "public" && visibility !== "private") throw new Error("Invalid visibility.");

  const conn = await connectToDatabase();
  const group = await GroupModel.findById(groupId).lean();
  if (!group) throw new Error("Group not found.");
  if (group.ownerId.toString() !== user._id.toString()) throw new Error("Only the owner can edit this group.");

  // Use raw collection to bypass Mongoose strict-mode stripping the visibility field
  await conn.connection.db!.collection("groups").updateOne(
    { _id: new Types.ObjectId(groupId) },
    { $set: { name, visibility } }
  );

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  redirect(`/groups/${groupId}`);
}

export async function deleteGroupAction(formData: FormData) {
  const user = await requireAuthUser();
  const groupId = formData.get("groupId")?.toString() || "";
  if (!groupId) throw new Error("Group id is required.");

  await connectToDatabase();
  const group = await GroupModel.findById(groupId).lean();
  if (!group) throw new Error("Group not found.");
  if (group.ownerId.toString() !== user._id.toString()) throw new Error("Only the owner can delete this group.");

  const marketIds = (await MarketModel.find({ groupId }, { _id: 1 }).lean()).map((m) => m._id);

  await Promise.all([
    BetModel.deleteMany({ marketId: { $in: marketIds } }),
    MarketPriceHistoryModel.deleteMany({ marketId: { $in: marketIds } }),
    MarketModel.deleteMany({ groupId }),
    ActivityModel.deleteMany({ groupId }),
    GroupMemberModel.deleteMany({ groupId }),
    JoinRequestModel.deleteMany({ groupId }),
    GroupModel.deleteOne({ _id: groupId }),
  ]);

  revalidatePath("/groups");
  redirect("/groups");
}

export async function requestJoinGroupAction(formData: FormData) {
  const user = await requireAuthUser();
  const groupId = formData.get("groupId")?.toString() || "";
  if (!groupId) throw new Error("Group id is required.");

  await connectToDatabase();
  const group = await GroupModel.findById(groupId).lean() as Record<string, unknown> | null;
  if (!group) throw new Error("Group not found.");
  if (group.visibility !== "private") throw new Error("This group is public — join directly.");

  const isMember = await GroupMemberModel.exists({ groupId, userId: user._id });
  if (isMember) {
    redirect(`/groups/${groupId}`);
  }

  const existing = await JoinRequestModel.findOne({ groupId, userId: user._id });
  if (existing) {
    redirect(`/groups/${groupId}?info=already_requested`);
  }

  await JoinRequestModel.create({ groupId, userId: user._id, status: "pending" });
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}?info=request_sent`);
}

export async function approveJoinRequestAction(formData: FormData) {
  const user = await requireAuthUser();
  const requestId = formData.get("requestId")?.toString() || "";
  if (!requestId) throw new Error("Request id is required.");

  await connectToDatabase();
  const joinReq = await JoinRequestModel.findById(requestId);
  if (!joinReq) throw new Error("Request not found.");

  const group = await GroupModel.findById(joinReq.groupId).lean();
  if (!group || group.ownerId.toString() !== user._id.toString()) {
    throw new Error("Only the owner can approve requests.");
  }

  await JoinRequestModel.updateOne({ _id: requestId }, { $set: { status: "approved" } });

  const alreadyMember = await GroupMemberModel.exists({ groupId: joinReq.groupId, userId: joinReq.userId });
  if (!alreadyMember) {
    await GroupMemberModel.create({ groupId: joinReq.groupId, userId: joinReq.userId, role: "member" });
    await ActivityModel.create({
      groupId: joinReq.groupId,
      actorUserId: joinReq.userId,
      type: "member_joined",
      metadata: { via: "request_approved" },
    });
  }

  revalidatePath(`/groups/${joinReq.groupId.toString()}`);
}

export async function denyJoinRequestAction(formData: FormData) {
  const user = await requireAuthUser();
  const requestId = formData.get("requestId")?.toString() || "";
  if (!requestId) throw new Error("Request id is required.");

  await connectToDatabase();
  const joinReq = await JoinRequestModel.findById(requestId);
  if (!joinReq) throw new Error("Request not found.");

  const group = await GroupModel.findById(joinReq.groupId).lean();
  if (!group || group.ownerId.toString() !== user._id.toString()) {
    throw new Error("Only the owner can deny requests.");
  }

  await JoinRequestModel.updateOne({ _id: requestId }, { $set: { status: "denied" } });

  revalidatePath(`/groups/${joinReq.groupId.toString()}`);
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireAuthUser();
  const firstName = formData.get("firstName")?.toString().trim() || "";
  const lastName = formData.get("lastName")?.toString().trim() || "";
  const displayName = `${firstName} ${lastName}`.trim();
  const avatarUrl = formData.get("avatarUrl")?.toString().trim() || "";
  if (!firstName || !lastName) throw new Error("First and last name are required.");
  await connectToDatabase();
  await UserModel.updateOne(
    { _id: user._id },
    { name: displayName, firstName, lastName, displayName, avatarUrl }
  );
  revalidatePath("/profile");
  revalidatePath(`/users/${user._id.toString()}`);
  revalidatePath("/dashboard");
}
