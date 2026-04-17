import "server-only";
import { hash } from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { generateInviteCode } from "@/lib/utils";
import { GroupModel } from "@/models/Group";
import { GroupMemberModel } from "@/models/GroupMember";
import { UserModel } from "@/models/User";

const BOT_ARENA_GROUP_NAME = "Bot Arena";

export const BOT_DEFS = [
  {
    firstName: "Bull",
    lastName: "Bradley",
    username: "bull_bradley",
    email: "bradley@mashi.bot",
    persona: `You are Bull Bradley, an optimistic bettor. You believe markets go up, weather will be nice, and people will follow through. You lean YES on most questions but you're not blind — if something is clearly unlikely you'll go NO. You bet between $5-$40. You speak with confidence and enthusiasm.`,
  },
  {
    firstName: "Bear",
    lastName: "Beatrice",
    username: "bear_beatrice",
    email: "beatrice@mashi.bot",
    persona: `You are Bear Beatrice, a skeptical contrarian. You think things are usually overhyped and outcomes disappoint. You lean NO and bet "under" on numeric thresholds. You bet conservatively, $5-$25, unless you feel very strongly (up to $40). You speak with dry wit.`,
  },
  {
    firstName: "Data",
    lastName: "Dana",
    username: "data_dana",
    email: "dana@mashi.bot",
    persona: `You are Data Dana, a probabilities-obsessed analyst. You reason from base rates and historical data. If the market price diverges from what the data suggests, you exploit the gap. You bet $10-$50 proportional to your confidence. You explain your reasoning with numbers.`,
  },
  {
    firstName: "Momentum",
    lastName: "Mike",
    username: "momentum_mike",
    email: "mike@mashi.bot",
    persona: `You are Momentum Mike, a trend-follower who sometimes flips. Early on you follow the crowd. Once the price gets extreme (above 80% or below 20%) you sometimes take the contrarian side for value. You bet $5-$35. You speak in short, punchy takes.`,
  },
];

let arenaSeeded = false;

export async function ensureBotArena() {
  if (arenaSeeded) return;

  const conn = await connectToDatabase();
  const defaultHash = await hash("bot-no-login", 10);

  const botUsers = [];
  for (const def of BOT_DEFS) {
    const fullName = `${def.firstName} ${def.lastName}`;
    let user = await UserModel.findOne({ email: def.email });
    if (!user) {
      user = await UserModel.create({
        name: fullName,
        firstName: def.firstName,
        lastName: def.lastName,
        username: def.username,
        displayName: fullName,
        email: def.email,
        passwordHash: defaultHash,
        avatarUrl: "",
        isBot: true,
        botPersona: def.persona,
      });
    } else {
      await conn.connection.db!.collection("users").updateOne(
        { _id: user._id },
        { $set: { isBot: true, botPersona: def.persona } },
      );
    }
    botUsers.push(user);
  }

  let group = await GroupModel.findOne({ name: BOT_ARENA_GROUP_NAME });
  if (!group) {
    group = await GroupModel.create({
      name: BOT_ARENA_GROUP_NAME,
      description: "AI-powered bots betting on real-world events",
      ownerId: botUsers[0]._id,
      inviteCode: generateInviteCode(),
    });
    await conn.connection.db!.collection("groups").updateOne(
      { _id: group._id },
      { $set: { visibility: "public" } },
    );
  }

  for (const [i, bot] of botUsers.entries()) {
    await GroupMemberModel.updateOne(
      { groupId: group._id, userId: bot._id },
      { $set: { role: i === 0 ? "owner" : "member" } },
      { upsert: true },
    );
  }

  arenaSeeded = true;
  return { group, botUsers };
}

export async function getBotArenaData() {
  await connectToDatabase();
  const group = await GroupModel.findOne({ name: BOT_ARENA_GROUP_NAME }).lean();
  if (!group) return null;
  const botUsers = await UserModel.find({ email: { $in: BOT_DEFS.map((d) => d.email) } }).lean();
  return { group, botUsers };
}
