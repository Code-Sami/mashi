import "server-only";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { connectToDatabase } from "@/lib/mongodb";
import { getPrices } from "@/lib/market";
import { getLlmArenaData, type LlmProvider } from "@/lib/llm-arena";
import { extractJson, isDuplicateQuestion } from "@/lib/bot-engine";
import { ActivityModel } from "@/models/Activity";
import { BetModel } from "@/models/Bet";
import { MarketModel } from "@/models/Market";
import { MarketPriceHistoryModel } from "@/models/MarketPriceHistory";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MARKET_CREATION_PROMPT = `You are {botName}, an AI model competing in a prediction market arena against other LLMs.

{persona}

IMPORTANT: Search the web FIRST to find current news, prices, weather forecasts, sports schedules, and events. Then create a compelling Yes/No question based on what you find.

Rules:
- Search the web for CURRENT data before creating the question
- The question MUST be objectively verifiable within 24-48 hours
- Set thresholds near current values so the outcome is genuinely uncertain (close to 50/50)
- Include specific numbers, locations, dates, and times
- Use "tomorrow" relative to today's date: {today}
- Vary topics: sports, weather, finance, crypto, politics, pop culture, tech

Here are recent markets (open AND resolved) — do NOT create anything similar:
{existingMarkets}

You MUST create a COMPLETELY DIFFERENT topic from all of the above. If you can't think of something new, respond with {"skip": true}.

Respond with JSON only:
{"question": "...", "deadlineHours": 24}
or if you can't think of a good non-duplicate question:
{"skip": true}`;

const BET_PROMPT = `You are {botName}, an AI model competing in a prediction market arena.

{persona}

IMPORTANT: Search the web FIRST to research the current situation relevant to these markets. Look up current prices, forecasts, news, standings, etc. Then pick the market where you have the strongest edge and bet on it.

Here are the active markets you can bet on:
{marketsList}

Your previous bets: {previousBets}

Choose the market where you have the best information edge, then place your bet. You are competing to have the best P&L. Bet wisely and explain your reasoning with data.

Respond with JSON only:
{"action": "bet", "marketIndex": <0-based index of chosen market>, "side": "yes" or "no", "amount": <number 5-50>, "reasoning": "1-2 sentence explanation referencing your research"}
Only pass if you literally cannot form an opinion on ANY market:
{"action": "pass", "reasoning": "1 sentence why you're passing"}`;

const RESOLUTION_PROMPT = `A prediction market needs to be resolved. Search the web to determine the factual outcome.

Question: "{question}"
Deadline was: {deadline}

Search for the actual real-world result and determine if the answer is YES or NO.

Respond with JSON only:
{"outcome": "yes" or "no", "evidence": "1-2 sentences citing what you found"}
or if you genuinely cannot determine the result:
{"outcome": null, "evidence": "explanation of why it's unclear"}`;

async function callModel(
  provider: LlmProvider,
  model: string,
  prompt: string,
): Promise<string | null> {
  try {
    if (provider === "openai") {
      const response = await openai.responses.create({
        model,
        tools: [{ type: "web_search_preview" }],
        input: prompt,
      });
      return response.output_text?.trim() || null;
    }

    const response = await genai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text?.trim() || null;
  } catch (e) {
    console.error(`LLM call failed (${provider}/${model}):`, e);
    return null;
  }
}

type BotUser = {
  _id: { toString(): string };
  displayName?: string;
  name?: string;
  botPersona?: string;
  botProvider?: string;
  botModel?: string;
};

type TickResult = {
  action: "created_market" | "placed_bet" | "resolved_market" | "passed" | "no_action";
  detail: string;
};

type MultiTickResult = {
  actions: TickResult[];
  summary: string;
};

function getBotProvider(bot: BotUser): LlmProvider {
  return (bot.botProvider as LlmProvider) || "openai";
}

function getBotModel(bot: BotUser): string {
  return bot.botModel || "gpt-4o-mini";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function runLlmTick(
  onProgress?: (msg: string) => void,
): Promise<MultiTickResult> {
  const emit = onProgress || (() => {});

  emit("Connecting to arena…");
  const arena = await getLlmArenaData();
  if (!arena) return { actions: [], summary: "LLM Arena not found" };

  await connectToDatabase();
  const { group, botUsers } = arena;
  const groupId = group._id;
  const results: TickResult[] = [];

  // ── Phase 1: Resolve all expired markets ──
  emit("Scanning markets for resolution…");
  const openMarkets = await MarketModel.find({ groupId, status: "open" }).lean();
  const resolutionBuffer = 5 * 60 * 1000;
  const marketsToResolve = openMarkets.filter(
    (m) => new Date(m.deadline).getTime() + resolutionBuffer < Date.now(),
  );
  for (const market of marketsToResolve) {
    const resolver = botUsers[Math.floor(Math.random() * botUsers.length)];
    const resolverName = resolver.displayName || resolver.name || "Bot";
    emit(`${resolverName} resolving "${market.question.slice(0, 50)}…"`);
    const result = await resolveMarket(market, group, resolver);
    if (result) results.push(result);
  }

  // ── Phase 2: Create a market if needed ──
  const activeMarkets = openMarkets.filter(
    (m) => new Date(m.deadline).getTime() > Date.now(),
  );
  const shouldCreate = activeMarkets.length === 0 || (activeMarkets.length < 6 && Math.random() < 0.5);
  if (shouldCreate) {
    const recentMarkets = await MarketModel.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    const creator = botUsers[Math.floor(Math.random() * botUsers.length)];
    const creatorName = creator.displayName || creator.name || "Bot";
    emit(`${creatorName} researching new market…`);
    const result = await createMarket(group, creator, recentMarkets);
    if (result) results.push(result);
  }

  // ── Phase 3: Random bots each choose a market and bet ──
  const currentActive = await MarketModel.find({ groupId, status: "open" }).lean();
  const liveBettable = currentActive.filter(
    (m) => new Date(m.deadline).getTime() > Date.now(),
  );

  if (liveBettable.length > 0) {
    const BOTS_PER_TICK = Math.min(2, botUsers.length);
    const selectedBots = shuffle(botUsers).slice(0, BOTS_PER_TICK);

    emit(`${selectedBots.map((b) => b.displayName || b.name).join(" & ")} choosing markets…`);

    const betPromises = selectedBots.map((bot) =>
      placeBet(liveBettable, group, bot).catch((e) => {
        console.error(`Bet error (${bot.name}):`, e);
        return { action: "no_action" as const, detail: `${bot.name}: error` };
      }),
    );
    const betResults = await Promise.all(betPromises);
    results.push(...betResults.filter((r) => r.action !== "no_action"));
  }

  const bets = results.filter((r) => r.action === "placed_bet").length;
  const created = results.filter((r) => r.action === "created_market").length;
  const resolved = results.filter((r) => r.action === "resolved_market").length;

  emit(`Done — ${resolved} resolved, ${created} created, ${bets} bets`);

  return {
    actions: results,
    summary: `Resolved: ${resolved}, Created: ${created}, Bets: ${bets}`,
  };
}

async function createMarket(
  group: { _id: { toString(): string } },
  creator: BotUser,
  existingMarkets: Array<{ question: string }>,
): Promise<TickResult | null> {
  try {
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const botName = creator.displayName || creator.name || "Bot";
    const prompt = MARKET_CREATION_PROMPT
      .replace("{botName}", botName)
      .replace("{persona}", creator.botPersona || "You are a prediction market bot.")
      .replace("{existingMarkets}", existingMarkets.map((m) => `- ${m.question}`).join("\n") || "None")
      .replace("{today}", today);

    const content = await callModel(getBotProvider(creator), getBotModel(creator), prompt);
    if (!content) return null;

    const parsed = extractJson(content) as { skip?: boolean; question?: string; deadlineHours?: number } | null;
    if (!parsed || parsed.skip || !parsed.question) return null;

    if (await isDuplicateQuestion(parsed.question, existingMarkets.map((m) => m.question))) {
      console.log("LLM skipped duplicate question:", parsed.question);
      return null;
    }

    const deadlineHours = Math.min(Math.max(parsed.deadlineHours || 24, 12), 48);
    const deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

    const market = await MarketModel.create({
      question: parsed.question,
      description: "",
      deadline,
      umpireId: creator._id,
      groupId: group._id,
      taggedUserIds: [],
      excludedUserIds: [],
      yesShares: 0,
      noShares: 0,
      totalVolume: 0,
      status: "open",
      outcome: null,
    });

    await MarketPriceHistoryModel.create({
      marketId: market._id,
      yesPrice: 0.5,
      noPrice: 0.5,
      totalVolume: 0,
      source: "seed",
    });

    await ActivityModel.create({
      groupId: group._id,
      actorUserId: creator._id,
      type: "market_created",
      marketId: market._id,
      metadata: { question: parsed.question, isBot: true },
    });

    return {
      action: "created_market",
      detail: `${botName} created: "${parsed.question}" (deadline: ${deadlineHours}h)`,
    };
  } catch (e) {
    console.error("LLM market creation failed:", e);
    return null;
  }
}

type MarketDoc = {
  _id: { toString(): string };
  question: string;
  yesShares: number;
  noShares: number;
  totalVolume: number;
  deadline: Date;
  groupId: { toString(): string };
};

async function placeBet(
  markets: MarketDoc[],
  group: { _id: { toString(): string } },
  bot: BotUser,
): Promise<TickResult> {
  try {
    const botName = bot.displayName || bot.name || "Bot";

    const marketLines = markets.map((m, i) => {
      const p = getPrices(m.yesShares, m.noShares);
      return `[${i}] "${m.question}" — YES ${Math.round(p.yesPrice * 100)}% / NO ${Math.round(p.noPrice * 100)}% — $${m.totalVolume.toFixed(2)} vol — deadline: ${new Date(m.deadline).toLocaleString()}`;
    });

    const myBets = await BetModel.find({
      marketId: { $in: markets.map((m) => m._id) },
      userId: bot._id,
    }).lean();
    const previousBetsStr = myBets.length === 0
      ? "None"
      : myBets.map((b) => {
          const mkt = markets.find((m) => m._id.toString() === b.marketId.toString());
          const label = mkt ? `"${mkt.question.slice(0, 50)}…"` : "unknown";
          return `${label}: ${b.side.toUpperCase()} $${b.amount}`;
        }).join("; ");

    const prompt = BET_PROMPT
      .replace("{botName}", botName)
      .replace("{persona}", bot.botPersona || "You are a prediction market bot.")
      .replace("{marketsList}", marketLines.join("\n"))
      .replace("{previousBets}", previousBetsStr);

    const content = await callModel(getBotProvider(bot), getBotModel(bot), prompt);
    if (!content) return { action: "passed", detail: `${botName}: no response` };

    const parsed = extractJson(content) as {
      action: string;
      marketIndex?: number;
      side?: string;
      amount?: number;
      reasoning?: string;
    } | null;
    if (!parsed || parsed.action === "pass") {
      return { action: "passed", detail: `${botName} passed: ${parsed?.reasoning || "no valid response"}` };
    }

    const idx = parsed.marketIndex ?? 0;
    const chosenMarket = markets[Math.min(Math.max(idx, 0), markets.length - 1)];
    const side = parsed.side === "no" ? "no" : "yes";
    const amount = Math.min(Math.max(Math.round(parsed.amount || 10), 5), 50);

    const liveMarket = await MarketModel.findById(chosenMarket._id);
    if (!liveMarket || liveMarket.status !== "open") {
      return { action: "no_action", detail: "Market closed before bet" };
    }

    if (side === "yes") liveMarket.yesShares += amount;
    else liveMarket.noShares += amount;
    liveMarket.totalVolume += amount;
    const newPrices = getPrices(liveMarket.yesShares, liveMarket.noShares);
    await liveMarket.save();

    await BetModel.create({
      marketId: liveMarket._id,
      userId: bot._id,
      side,
      amount,
      yesPriceAfter: newPrices.yesPrice,
      noPriceAfter: newPrices.noPrice,
    });

    await MarketPriceHistoryModel.create({
      marketId: liveMarket._id,
      yesPrice: newPrices.yesPrice,
      noPrice: newPrices.noPrice,
      totalVolume: liveMarket.totalVolume,
      source: "bet",
    });

    await ActivityModel.create({
      groupId: group._id,
      actorUserId: bot._id,
      type: "bet_placed",
      marketId: liveMarket._id,
      metadata: {
        side,
        amount,
        reasoning: parsed.reasoning || "",
        isBot: true,
      },
    });

    const shortQ = chosenMarket.question.length > 60
      ? chosenMarket.question.slice(0, 57) + "…"
      : chosenMarket.question;
    return {
      action: "placed_bet",
      detail: `${botName} chose "${shortQ}" → ${side.toUpperCase()} $${amount}: ${parsed.reasoning}`,
    };
  } catch (e) {
    console.error("LLM bet failed:", e);
    return { action: "no_action", detail: `LLM bet error: ${e}` };
  }
}

async function resolveMarket(
  market: {
    _id: { toString(): string };
    question: string;
    deadline: Date;
    groupId: { toString(): string };
  },
  group: { _id: { toString(): string } },
  resolver: BotUser,
): Promise<TickResult | null> {
  try {
    const prompt = RESOLUTION_PROMPT
      .replace("{question}", market.question)
      .replace("{deadline}", new Date(market.deadline).toLocaleString());

    const content = await callModel(getBotProvider(resolver), getBotModel(resolver), prompt);
    if (!content) return null;

    const parsed = extractJson(content) as { outcome: string | null; evidence?: string } | null;
    if (!parsed || (parsed.outcome !== "yes" && parsed.outcome !== "no")) return null;

    const liveMarket = await MarketModel.findById(market._id);
    if (!liveMarket || liveMarket.status === "resolved") return null;

    liveMarket.status = "resolved";
    liveMarket.outcome = parsed.outcome;
    liveMarket.resolvedAt = new Date();
    await liveMarket.save();

    const bets = await BetModel.find({ marketId: liveMarket._id });
    const winningBets = bets.filter((b) => b.side === parsed.outcome);
    const winningPool = winningBets.reduce((s, b) => s + b.amount, 0);
    const totalPool = bets.reduce((s, b) => s + b.amount, 0);

    await Promise.all(
      bets.map((bet) => {
        if (bet.side !== parsed.outcome || winningPool <= 0 || totalPool <= 0) {
          return BetModel.updateOne({ _id: bet._id }, { payout: 0 });
        }
        const payout = (bet.amount / winningPool) * totalPool;
        return BetModel.updateOne({ _id: bet._id }, { payout });
      }),
    );

    await ActivityModel.create({
      groupId: group._id,
      actorUserId: resolver._id,
      type: "market_resolved",
      marketId: liveMarket._id,
      metadata: {
        outcome: parsed.outcome,
        evidence: parsed.evidence || "",
        isBot: true,
        autoResolved: true,
      },
    });

    return {
      action: "resolved_market",
      detail: `Resolved "${market.question}" → ${parsed.outcome.toUpperCase()}: ${parsed.evidence}`,
    };
  } catch (e) {
    console.error("LLM resolution failed:", e);
    return null;
  }
}
