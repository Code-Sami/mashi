import { NextRequest, NextResponse } from "next/server";
import { ensureBotArena } from "@/lib/bot-arena";
import { runBotTick } from "@/lib/bot-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request: NextRequest): boolean {
  // Vercel Cron sends this header automatically
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`) {
    return true;
  }
  // Manual trigger via BOT_TICK_SECRET
  const tickSecret = process.env.BOT_TICK_SECRET;
  if (tickSecret && request.headers.get("authorization") === `Bearer ${tickSecret}`) {
    return true;
  }
  return false;
}

async function handleTick() {
  await ensureBotArena();
  const result = await runBotTick();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return await handleTick();
  } catch (error) {
    console.error("Bot tick error:", error);
    return NextResponse.json({ error: "Internal error", detail: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return await handleTick();
  } catch (error) {
    console.error("Bot tick error:", error);
    return NextResponse.json({ error: "Internal error", detail: String(error) }, { status: 500 });
  }
}
