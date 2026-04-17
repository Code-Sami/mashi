import "server-only";
import { hash } from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { generateInviteCode } from "@/lib/utils";
import { GroupModel } from "@/models/Group";
import { GroupMemberModel } from "@/models/GroupMember";
import { UserModel } from "@/models/User";

const LLM_ARENA_GROUP_NAME = "LLM Arena";

export type LlmProvider = "openai" | "gemini";

export type LlmBotDef = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  provider: LlmProvider;
  model: string;
  persona: string;
};

function makePersona(displayName: string, provider: string, model: string): string {
  return `You are ${displayName}, representing ${provider} in a prediction market competition against other LLMs. You are powered by the ${model} model. Your goal is to maximize your P&L by making the most accurate, well-researched bets. Search the web thoroughly, analyze the data, and bet wisely. Show that ${displayName} is the smartest model. You LOVE betting and almost never pass. Your reasoning should be sharp, data-driven, and confident.`;
}

export const LLM_BOT_DEFS: LlmBotDef[] = [
  // ── OpenAI models ──
  {
    firstName: "GPT-5",
    lastName: "OpenAI",
    username: "gpt_5",
    email: "gpt5@mashi.llm",
    provider: "openai",
    model: "gpt-5",
    persona: makePersona("GPT-5", "OpenAI", "gpt-5"),
  },
  {
    firstName: "GPT-4.1",
    lastName: "OpenAI",
    username: "gpt_4_1",
    email: "gpt41@mashi.llm",
    provider: "openai",
    model: "gpt-4.1",
    persona: makePersona("GPT-4.1", "OpenAI", "gpt-4.1"),
  },
  {
    firstName: "GPT-4.1 Mini",
    lastName: "OpenAI",
    username: "gpt_4_1_mini",
    email: "gpt41mini@mashi.llm",
    provider: "openai",
    model: "gpt-4.1-mini",
    persona: makePersona("GPT-4.1 Mini", "OpenAI", "gpt-4.1-mini"),
  },
  {
    firstName: "GPT-4o",
    lastName: "OpenAI",
    username: "gpt_4o",
    email: "gpt4o@mashi.llm",
    provider: "openai",
    model: "gpt-4o",
    persona: makePersona("GPT-4o", "OpenAI", "gpt-4o"),
  },
  {
    firstName: "GPT-4o Mini",
    lastName: "OpenAI",
    username: "gpt_4o_mini",
    email: "gpt4omini@mashi.llm",
    provider: "openai",
    model: "gpt-4o-mini",
    persona: makePersona("GPT-4o Mini", "OpenAI", "gpt-4o-mini"),
  },
  {
    firstName: "o4-mini",
    lastName: "OpenAI",
    username: "o4_mini",
    email: "o4mini@mashi.llm",
    provider: "openai",
    model: "o4-mini",
    persona: makePersona("o4-mini", "OpenAI", "o4-mini"),
  },
  // ── Gemini models ──
  {
    firstName: "Gemini 3.1 Pro",
    lastName: "Google",
    username: "gemini_31_pro",
    email: "gemini31pro@mashi.llm",
    provider: "gemini",
    model: "gemini-3.1-pro-preview",
    persona: makePersona("Gemini 3.1 Pro", "Google", "gemini-3.1-pro-preview"),
  },
  {
    firstName: "Gemini 3 Flash",
    lastName: "Google",
    username: "gemini_3_flash",
    email: "gemini3flash@mashi.llm",
    provider: "gemini",
    model: "gemini-3-flash-preview",
    persona: makePersona("Gemini 3 Flash", "Google", "gemini-3-flash-preview"),
  },
  {
    firstName: "Gemini 2.5 Pro",
    lastName: "Google",
    username: "gemini_25_pro",
    email: "gemini25pro@mashi.llm",
    provider: "gemini",
    model: "gemini-2.5-pro",
    persona: makePersona("Gemini 2.5 Pro", "Google", "gemini-2.5-pro"),
  },
  {
    firstName: "Gemini 2.5 Flash",
    lastName: "Google",
    username: "gemini_25_flash",
    email: "gemini25flash@mashi.llm",
    provider: "gemini",
    model: "gemini-2.5-flash",
    persona: makePersona("Gemini 2.5 Flash", "Google", "gemini-2.5-flash"),
  },
  {
    firstName: "Gemini 2.5 Flash Lite",
    lastName: "Google",
    username: "gemini_25_flash_lite",
    email: "gemini25flashlite@mashi.llm",
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
    persona: makePersona("Gemini 2.5 Flash Lite", "Google", "gemini-2.5-flash-lite"),
  },
];

let arenaSeeded = false;

export async function ensureLlmArena() {
  if (arenaSeeded) return;

  const conn = await connectToDatabase();
  const defaultHash = await hash("bot-no-login", 10);

  const botUsers = [];
  for (const def of LLM_BOT_DEFS) {
    const displayName = def.firstName;
    let user = await UserModel.findOne({ email: def.email });
    if (!user) {
      user = await UserModel.create({
        name: displayName,
        firstName: def.firstName,
        lastName: def.lastName,
        username: def.username,
        displayName,
        email: def.email,
        passwordHash: defaultHash,
        avatarUrl: "",
        isBot: true,
        botPersona: def.persona,
      });
    }
    await conn.connection.db!.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          isBot: true,
          botPersona: def.persona,
          botProvider: def.provider,
          botModel: def.model,
        },
      },
    );
    botUsers.push(user);
  }

  let group = await GroupModel.findOne({ name: LLM_ARENA_GROUP_NAME });
  if (!group) {
    group = await GroupModel.create({
      name: LLM_ARENA_GROUP_NAME,
      description: "LLMs competing head-to-head on real-world predictions",
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

export async function getLlmArenaData() {
  await connectToDatabase();
  const group = await GroupModel.findOne({ name: LLM_ARENA_GROUP_NAME }).lean();
  if (!group) return null;
  const botEmails = LLM_BOT_DEFS.map((d) => d.email);
  const botUsers = await UserModel.find({ email: { $in: botEmails } }).lean();
  return { group, botUsers };
}
