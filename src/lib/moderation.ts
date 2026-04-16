import "server-only";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ModerationResult = {
  allowed: boolean;
  reason: string;
};

const SYSTEM_PROMPT = `You are a content moderator for a social prediction market app used by friend groups. Users create Yes/No betting questions about real-life events, social situations, and friendly wagers.

Your job is to flag questions that fall into these categories:
- Threats of violence or physical harm against specific people
- Extreme discrimination targeting race, gender, religion, sexuality, or disability
- Questions that incentivize dangerous, illegal, or self-harming real-world actions
- Sexual content involving minors

You must ALLOW questions that are:
- Provocative, embarrassing, or edgy humor between friends
- Gossip or social predictions ("Will X and Y start dating?")
- Mildly crude or irreverent language
- Competitive or boastful ("Will I beat Jake at chess?")
- About legal but controversial topics (politics, sports, personal habits)

When in doubt, ALLOW the question. This is a private friend group app, not a public forum. Be permissive.

Respond with valid JSON only, no markdown:
{"allowed": true} or {"allowed": false, "reason": "One sentence explaining why this was flagged."}`;

export async function moderateQuestion(question: string): Promise<ModerationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
      temperature: 0,
      max_tokens: 150,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return { allowed: true, reason: "" };

    const parsed = JSON.parse(content);
    return {
      allowed: parsed.allowed !== false,
      reason: parsed.reason || "",
    };
  } catch {
    // If AI is unavailable, allow the question rather than blocking users
    return { allowed: true, reason: "" };
  }
}
