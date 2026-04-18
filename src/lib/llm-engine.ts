import "server-only";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { connectToDatabase } from "@/lib/mongodb";
import { getPrices } from "@/lib/market";
import { getLlmArenaData, type LlmProvider } from "@/lib/llm-arena";
import { ActivityModel } from "@/models/Activity";
import { BetModel } from "@/models/Bet";
import { MarketModel } from "@/models/Market";
import { MarketPriceHistoryModel } from "@/models/MarketPriceHistory";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

const MARKET_CREATION_PROMPT = `You are {botName}, an AI model competing in a prediction market arena against other LLMs.

{persona}

IMPORTANT: Search the web FIRST to find current news, prices, weather forecasts, sports schedules, and events. Then create a compelling Yes/No question based on what you find.

Rules:
- Search the web for CURRENT data before creating the question
- The question MUST be objectively verifiable within 12-48 hours
- Set thresholds near current values so the outcome is genuinely uncertain (close to 50/50)
- Include specific numbers, locations, dates, and times
- Use "tomorrow" relative to today's date: {today}
- Vary topics: sports, weather, finance, crypto, politics, pop culture, tech
- CRITICAL: The deadline (deadlineHours) MUST be set BEFORE the event's observable time. For example, if the question asks about a value "at 11:00 AM", the deadline must expire before 11:00 AM so betting closes while the outcome is still uncertain. Choose deadlineHours accordingly (can be anywhere from 12 to 48).

Here are recent markets (open AND resolved) — do NOT create anything similar:
{existingMarkets}

You MUST create a COMPLETELY DIFFERENT topic from all of the above. If you can't think of something new, respond with {"skip": true}.

Respond with JSON only:
{"question": "...", "deadlineHours": <number between 12 and 48>}
or if you can't think of a good non-duplicate question:
{"skip": true}`;

const BET_PROMPT = `You are {botName}, an AI model competing in a prediction market arena.

{persona}

IMPORTANT: Search the web FIRST to research the current situation relevant to these markets. Look up current prices, forecasts, news, standings, etc. Then pick the market where you have the strongest edge and bet on it.

Here are the active markets you can bet on:
{marketsList}

Your previous bets: {previousBets}

Choose the market where you have the best information edge, then place your bet. You are competing to have the best P&L. Bet wisely and explain your reasoning with data.

Size your bet ($1–$100) based on your confidence and edge:
- Compare your estimated probability to the market's implied odds
- Bet MORE ($50–$100) when you have strong evidence and a large edge over the market price
- Bet MODERATELY ($20–$49) when you have decent evidence and a meaningful edge
- Bet LESS ($1–$19) when your edge is slim or evidence is weak
- Example: if the market says YES 30% but your research suggests 70%, that's a big edge → bet big

Respond with JSON only:
{"action": "bet", "marketIndex": <0-based index of chosen market>, "side": "yes" or "no", "amount": <number 1-100>, "reasoning": "1-2 sentence explanation referencing your research"}
Only pass if you literally cannot form an opinion on ANY market:
{"action": "pass", "reasoning": "1 sentence why you're passing"}`;

const RESOLUTION_PROMPT = `A prediction market needs to be resolved. You MUST search the web to find the factual answer.

Question: "{question}"
Deadline was: {deadline}
Current time (UTC): {now}

CRITICAL INSTRUCTIONS:
1. You MUST perform a web search before answering. Do NOT guess or use training data.
2. Read the question carefully. Identify the EXACT time window or event the question asks about.
3. Compare the event time to the CURRENT date/time above. If the event has NOT YET OCCURRED, you MUST return outcome null. Do NOT resolve based on forecasts, predictions, or projected values — only resolve based on ACTUAL OBSERVED data after the event has happened.
4. Find the EXACT data point the question asks about (price, score, temperature, etc.) at the EXACT time or date specified.
5. State the exact value you found, the time it was recorded, and the source.
6. Compare it to the threshold in the question to determine YES or NO.

Respond with JSON only:
{"outcome": "yes" or "no", "evidence": "At [specific time from the question], the value was [X] according to [source]. This is [above/below] the threshold of [Y]."}
or if the event hasn't happened yet OR you cannot find reliable data:
{"outcome": null, "evidence": "explanation — e.g. the event time is [X] which has not yet passed"}`;

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

const EXTRACT_JSON_PROMPT = `Extract the outcome from this prediction market research response.
Determine if the answer is YES, NO, or unclear/not yet happened (null).

Response to analyze:
"""
{text}
"""

Reply with ONLY this JSON, nothing else:
{"outcome": "yes" or "no", "evidence": "1-2 sentence summary of the finding"}
or if the event hasn't happened yet, data is based on forecasts, or it's otherwise unclear:
{"outcome": null, "evidence": "why it can't be resolved yet"}`;

async function summarizeEvidence(
  question: string,
  outcome: string,
  evidence1: string,
  evidence2: string,
): Promise<string> {
  const fallback = `Resolved ${outcome.toUpperCase()}. ${evidence1 || evidence2 || "No details available."}`;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [{
        role: "user",
        content: `Two independent AI judges researched this prediction market question and both agreed on the outcome. Write a brief, user-friendly summary (2-3 sentences) of what they found. Merge their findings into one cohesive explanation. Include specific data points and mention sources when available. Do NOT mention "Call 1", "Call 2", "judges", or "verification" — just present the facts.

Question: "${question}"
Outcome: ${outcome.toUpperCase()}

Judge 1 found: ${evidence1 || "no detail"}
Judge 2 found: ${evidence2 || "no detail"}

Write ONLY the summary, no JSON or formatting.`,
      }],
    });
    return response.choices[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

async function parseResolutionResponse(
  raw: string | null,
): Promise<{ outcome: string | null; evidence?: string } | null> {
  if (!raw) return null;

  const direct = extractJson(raw) as { outcome: string | null; evidence?: string } | null;
  if (direct && (direct.outcome === "yes" || direct.outcome === "no" || direct.outcome === null)) {
    return direct;
  }

  // Fallback: web search responses sometimes come back as plain text.
  // Use a cheap model to extract the structured answer.
  try {
    const fallback = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: EXTRACT_JSON_PROMPT.replace("{text}", raw.slice(0, 2000)) }],
      temperature: 0,
    });
    const text = fallback.choices[0]?.message?.content?.trim() || "";
    return extractJson(text) as { outcome: string | null; evidence?: string } | null;
  } catch (e) {
    console.error("Fallback JSON extraction failed:", e);
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
    emit(`Resolving "${market.question.slice(0, 50)}…" with dual verification`);
    const result = await resolveMarket(market, group, resolver, emit);
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
    const amount = Math.min(Math.max(Math.round(parsed.amount || 10), 1), 100);

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
  emit: (msg: string) => void,
): Promise<TickResult | null> {
  try {
    const prompt = RESOLUTION_PROMPT
      .replace("{question}", market.question)
      .replace("{deadline}", new Date(market.deadline).toLocaleString())
      .replace("{now}", new Date().toISOString());

    const shortQ = market.question.length > 50
      ? market.question.slice(0, 47) + "…"
      : market.question;

    // Step 1: GPT-4o resolves with web search
    emit(`GPT-4o researching "${shortQ}"…`);
    const gptContent = await callModel("openai", "gpt-4o", prompt);
    const gptParsed = await parseResolutionResponse(gptContent);

    if (!gptParsed || (gptParsed.outcome !== "yes" && gptParsed.outcome !== "no")) {
      emit(`GPT-4o could not determine outcome, skipping`);
      return null;
    }

    // Step 2: Second GPT-4o call verifies independently
    emit(`GPT-4o verifying "${shortQ}"…`);
    const verifierContent = await callModel("openai", "gpt-4o", prompt);
    const verifierParsed = await parseResolutionResponse(verifierContent);

    if (!verifierParsed || (verifierParsed.outcome !== "yes" && verifierParsed.outcome !== "no")) {
      emit(`Verifier could not determine outcome, skipping`);
      return null;
    }

    // Step 3: Both must agree
    if (gptParsed.outcome !== verifierParsed.outcome) {
      emit(`Models disagree on "${shortQ}" (call 1: ${gptParsed.outcome}, call 2: ${verifierParsed.outcome}) — leaving pending`);
      return {
        action: "no_action",
        detail: `Disagreement on "${market.question}": call1=${gptParsed.outcome} (${gptParsed.evidence}), call2=${verifierParsed.outcome} (${verifierParsed.evidence})`,
      };
    }

    const outcome = gptParsed.outcome;
    const evidence = await summarizeEvidence(
      market.question,
      outcome,
      gptParsed.evidence || "",
      verifierParsed.evidence || "",
    );

    const liveMarket = await MarketModel.findById(market._id);
    if (!liveMarket || liveMarket.status === "resolved") return null;

    liveMarket.status = "resolved";
    liveMarket.outcome = outcome;
    liveMarket.resolvedAt = new Date();
    await liveMarket.save();

    const bets = await BetModel.find({ marketId: liveMarket._id });
    const winningBets = bets.filter((b) => b.side === outcome);
    const winningPool = winningBets.reduce((s, b) => s + b.amount, 0);
    const totalPool = bets.reduce((s, b) => s + b.amount, 0);

    await Promise.all(
      bets.map((bet) => {
        if (bet.side !== outcome || winningPool <= 0 || totalPool <= 0) {
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
        outcome,
        evidence,
        isBot: true,
        autoResolved: true,
      },
    });

    return {
      action: "resolved_market",
      detail: `Resolved "${market.question}" → ${outcome.toUpperCase()} (both models agree): ${evidence}`,
    };
  } catch (e) {
    console.error("LLM resolution failed:", e);
    return null;
  }
}
