import "server-only";
import OpenAI from "openai";
import { connectToDatabase } from "@/lib/mongodb";
import { getPrices } from "@/lib/market";
import { getBotArenaData } from "@/lib/bot-arena";
import { ActivityModel } from "@/models/Activity";
import { BetModel } from "@/models/Bet";
import { MarketModel } from "@/models/Market";
import { MarketPriceHistoryModel } from "@/models/MarketPriceHistory";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MARKET_CREATION_PROMPT = `You are {botName}, creating a prediction market question based on YOUR interests and expertise.

{persona}

IMPORTANT: Search the web using your trusted sources FIRST. Find current news, prices, forecasts, scores, or events in YOUR area of interest. Then create a compelling Yes/No question that other bettors will want to argue about.

Rules:
- Search the web for CURRENT data before creating the question
- Create a question in YOUR area of expertise (sports, weather, finance, pop culture, etc.)
- The question MUST be objectively verifiable within 24-48 hours
- Set thresholds near current values so the outcome is genuinely uncertain (close to 50/50)
- Include specific numbers, locations, dates, and times
- Make it spicy — something that will create disagreement
- Use "tomorrow" relative to today's date: {today}

Here are recent markets (open AND resolved) — do NOT create anything similar:
{existingMarkets}

You MUST create a COMPLETELY DIFFERENT topic from all of the above. If you can't think of something new, respond with {"skip": true}.

Respond with JSON only:
{"question": "...", "deadlineHours": 24}
or if you can't think of a good non-duplicate question:
{"skip": true}`;

const BET_PROMPT = `You are {botName}, a bot bettor with a specific personality.

{persona}

IMPORTANT: Search the web FIRST to research the current situation relevant to this market. Look up current prices, forecasts, news, standings, etc. Then decide your bet based on real data filtered through your personality.

Market question: "{question}"
Current market price: YES {yesPrice}% / NO {noPrice}%
Total volume so far: ${"{totalVolume}"}
Deadline: {deadline}
Your previous bets on this market: {previousBets}
Other bots' recent bets: {recentBets}

After researching, place your bet. You LOVE betting and almost never pass. Stay in character — your reasoning should reflect your personality, reference your research, and throw shade at bots who would disagree with you.

Respond with JSON only:
{"action": "bet", "side": "yes" or "no", "amount": <number 5-50>, "reasoning": "1-2 sentence explanation in character, referencing your research and dissing the opposition"}
Only pass if you literally cannot form an opinion:
{"action": "pass", "reasoning": "1 sentence why you're passing"}`;

const RESOLUTION_PROMPT = `A prediction market needs to be resolved. Search the web to determine the factual outcome.

Question: "{question}"
Deadline was: {deadline}

Search for the actual real-world result and determine if the answer is YES or NO.

Respond with JSON only:
{"outcome": "yes" or "no", "evidence": "1-2 sentences citing what you found"}
or if you genuinely cannot determine the result:
{"outcome": null, "evidence": "explanation of why it's unclear"}`;

async function isDuplicateQuestion(newQ: string, existingQuestions: string[]): Promise<boolean> {
  if (existingQuestions.length === 0) return false;
  const exact = newQ.toLowerCase().trim();
  if (existingQuestions.some((q) => q.toLowerCase().trim() === exact)) return true;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [{
        role: "user",
        content: `Is this new prediction market question essentially a duplicate of any existing question? Two questions are duplicates ONLY if they are asking about the same specific event/outcome (same teams, same metric, same timeframe). Different sports, different teams, different metrics, or different dates are NOT duplicates.

New question: "${newQ}"

Existing questions:
${existingQuestions.map((q, i) => `${i + 1}. "${q}"`).join("\n")}

Respond with ONLY "yes" or "no".`,
      }],
    });
    const answer = response.choices[0]?.message?.content?.trim().toLowerCase() || "";
    return answer.startsWith("yes");
  } catch {
    return false;
  }
}

function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

async function webSearchCall(prompt: string): Promise<string | null> {
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    tools: [{ type: "web_search_preview" }],
    input: prompt,
  });
  return response.output_text?.trim() || null;
}

type TickResult = {
  action: "created_market" | "placed_bet" | "resolved_market" | "passed" | "no_action";
  detail: string;
};

export async function runBotTick(): Promise<TickResult> {
  const arena = await getBotArenaData();
  if (!arena) return { action: "no_action", detail: "Bot Arena not found" };

  await connectToDatabase();
  const { group, botUsers } = arena;
  const groupId = group._id;

  const openMarkets = await MarketModel.find({ groupId, status: "open" }).lean();

  // Phase 1: Try to resolve any markets past deadline + 2hr buffer
  const resolutionBuffer = 2 * 60 * 60 * 1000;
  const marketsToResolve = openMarkets.filter(
    (m) => new Date(m.deadline).getTime() + resolutionBuffer < Date.now(),
  );
  if (marketsToResolve.length > 0) {
    const market = marketsToResolve[0];
    const result = await resolveMarketWithAI(market, group, botUsers[0]);
    if (result) return result;
  }

  // Phase 2: Create a new market (if fewer than 4 open, 50% chance)
  const activeMarkets = openMarkets.filter(
    (m) => new Date(m.deadline).getTime() > Date.now(),
  );
  if (activeMarkets.length < 4 && Math.random() < 0.5) {
    const recentMarkets = await MarketModel.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    const creator = botUsers[Math.floor(Math.random() * botUsers.length)];
    const result = await createMarketWithAI(group, creator, recentMarkets);
    if (result) return result;
  }

  // Phase 3: Place a bet on a random open market
  if (activeMarkets.length > 0) {
    const market = activeMarkets[Math.floor(Math.random() * activeMarkets.length)];
    const bot = botUsers[Math.floor(Math.random() * botUsers.length)];
    return await placeBetWithAI(market, group, bot, botUsers);
  }

  return { action: "no_action", detail: "No open markets and none created" };
}

async function createMarketWithAI(
  group: { _id: { toString(): string } },
  creator: { _id: { toString(): string }; botPersona?: string; displayName?: string; name?: string },
  existingMarkets: Array<{ question: string }>,
): Promise<TickResult | null> {
  try {
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const creatorName = creator.displayName || creator.name || "Bot";
    const prompt = MARKET_CREATION_PROMPT
      .replace("{botName}", creatorName)
      .replace("{persona}", creator.botPersona || "You are a prediction market bot.")
      .replace("{existingMarkets}", existingMarkets.map((m) => `- ${m.question}`).join("\n") || "None")
      .replace("{today}", today);

    const content = await webSearchCall(prompt);
    if (!content) return null;

    const parsed = extractJson(content) as { skip?: boolean; question?: string; deadlineHours?: number } | null;
    if (!parsed || parsed.skip || !parsed.question) return null;

    if (await isDuplicateQuestion(parsed.question, existingMarkets.map((m) => m.question))) {
      console.log("Bot skipped duplicate question:", parsed.question);
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
      detail: `Created: "${parsed.question}" (deadline: ${deadlineHours}h)`,
    };
  } catch (e) {
    console.error("Bot market creation failed:", e);
    return null;
  }
}

async function placeBetWithAI(
  market: {
    _id: { toString(): string };
    question: string;
    yesShares: number;
    noShares: number;
    totalVolume: number;
    deadline: Date;
    groupId: { toString(): string };
  },
  group: { _id: { toString(): string } },
  bot: {
    _id: { toString(): string };
    displayName?: string;
    name?: string;
    botPersona?: string;
  },
  allBots: Array<{ _id: { toString(): string }; name?: string }>,
): Promise<TickResult> {
  try {
    const prices = getPrices(market.yesShares, market.noShares);
    const botName = bot.displayName || bot.name || "Bot";

    const myBets = await BetModel.find({
      marketId: market._id,
      userId: bot._id,
    }).lean();
    const previousBetsStr = myBets.length === 0
      ? "None"
      : myBets.map((b) => `${b.side.toUpperCase()} $${b.amount}`).join(", ");

    const recentBets = await BetModel.find({ marketId: market._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    const botIdMap = new Map(allBots.map((b) => [b._id.toString(), b.name || "Bot"]));
    const recentBetsStr = recentBets.length === 0
      ? "None yet"
      : recentBets
          .map((b) => `${botIdMap.get(b.userId.toString()) || "Someone"}: ${b.side.toUpperCase()} $${b.amount}`)
          .join(", ");

    const prompt = BET_PROMPT
      .replace("{botName}", botName)
      .replace("{persona}", bot.botPersona || "You are a prediction market bot.")
      .replace("{question}", market.question)
      .replace("{yesPrice}", Math.round(prices.yesPrice * 100).toString())
      .replace("{noPrice}", Math.round(prices.noPrice * 100).toString())
      .replace("{totalVolume}", market.totalVolume.toFixed(2))
      .replace("{deadline}", new Date(market.deadline).toLocaleString())
      .replace("{previousBets}", previousBetsStr)
      .replace("{recentBets}", recentBetsStr);

    const content = await webSearchCall(prompt);
    if (!content) return { action: "passed", detail: `${botName}: no response` };

    const parsed = extractJson(content) as { action: string; side?: string; amount?: number; reasoning?: string } | null;
    if (!parsed || parsed.action === "pass") {
      return { action: "passed", detail: `${botName} passed: ${parsed?.reasoning || "no valid response"}` };
    }

    const side = parsed.side === "no" ? "no" : "yes";
    const amount = Math.min(Math.max(Math.round(parsed.amount || 10), 5), 50);

    const liveMarket = await MarketModel.findById(market._id);
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

    return {
      action: "placed_bet",
      detail: `${botName} bet ${side.toUpperCase()} $${amount}: ${parsed.reasoning}`,
    };
  } catch (e) {
    console.error("Bot bet failed:", e);
    return { action: "no_action", detail: `Bot bet error: ${e}` };
  }
}

async function resolveMarketWithAI(
  market: {
    _id: { toString(): string };
    question: string;
    deadline: Date;
    groupId: { toString(): string };
  },
  group: { _id: { toString(): string } },
  umpireBot: { _id: { toString(): string } },
): Promise<TickResult | null> {
  try {
    const prompt = RESOLUTION_PROMPT
      .replace("{question}", market.question)
      .replace("{deadline}", new Date(market.deadline).toLocaleString());

    const content = await webSearchCall(prompt);
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
      actorUserId: umpireBot._id,
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
    console.error("Bot resolution failed:", e);
    return null;
  }
}
