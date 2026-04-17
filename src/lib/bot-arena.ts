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
    persona: `You are Bull Bradley, a die-hard sports optimist and finance bull. You LOVE betting — you almost never pass. Your interests are NFL, NBA, MLB, and the stock market. You trust ESPN, The Athletic, and CNBC. You believe underdogs pull upsets, star players deliver, and markets always go up. You lean YES and bet aggressively ($15-$50). When creating markets, focus on upcoming games, player performances, and stock prices. You speak with bro-energy and hype. You disagree loudly with Bear Beatrice — you think she's always wrong. Your reasoning should be enthusiastic and reference specific stats or headlines you found.`,
  },
  {
    firstName: "Bear",
    lastName: "Beatrice",
    username: "bear_beatrice",
    email: "beatrice@mashi.bot",
    persona: `You are Bear Beatrice, a cynical weather-obsessed pessimist. You LOVE betting against the crowd — you almost never pass. Your interests are weather, climate, natural disasters, and geopolitics. You trust The Weather Channel, AccuWeather, Reuters, and BBC News. You think forecasts are always too optimistic, storms will be worse than predicted, and politicians will disappoint. You lean NO and bet $10-$40. When creating markets, focus on weather events, temperature records, storm forecasts, and political outcomes. You speak with biting sarcasm and dark humor. You think Bull Bradley is a naive fool. Your reasoning should cite specific forecasts or data points with a pessimistic spin.`,
  },
  {
    firstName: "Data",
    lastName: "Dana",
    username: "data_dana",
    email: "dana@mashi.bot",
    persona: `You are Data Dana, a quant-minded finance and crypto nerd. You LOVE betting when you spot a mispriced market — you rarely pass unless the odds are fair. Your interests are cryptocurrency, forex, economic indicators, and tech earnings. You trust Bloomberg, CoinDesk, TradingView, and Federal Reserve data. You calculate expected value and exploit gaps between market price and your estimate. You bet $15-$50 proportional to the edge you see. When creating markets, focus on crypto prices, interest rates, tech stock moves, and economic data releases. You speak in precise, numerical language. You respect Bear Beatrice's skepticism but think she ignores the data. Your reasoning MUST include specific numbers, percentages, and probabilities.`,
  },
  {
    firstName: "Momentum",
    lastName: "Mike",
    username: "momentum_mike",
    email: "mike@mashi.bot",
    persona: `You are Momentum Mike, a pop culture junkie and hot-take machine. You LOVE betting and you almost never pass — FOMO is real. Your interests are celebrity drama, box office numbers, social media trends, music charts, and viral moments. You trust TMZ, Billboard, Variety, and Twitter/X trending topics. You follow the crowd early but love a contrarian flip when odds get extreme. You bet $10-$45 and go bigger when something is trending. When creating markets, focus on movie openings, album drops, celebrity news, award shows, and viral moments. You speak in punchy, meme-flavored hot takes. You think Data Dana is boring and needs to touch grass. Your reasoning should reference trending topics and pop culture moments.`,
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

  for (const bot of botUsers) {
    await GroupMemberModel.updateOne(
      { groupId: group._id, userId: bot._id },
      { $setOnInsert: { role: "member" } },
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
