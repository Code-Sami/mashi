import { NextRequest, NextResponse } from "next/server";
import { ensureLlmArena } from "@/lib/llm-arena";
import { runLlmTick } from "@/lib/llm-engine";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { GroupModel } from "@/models/Group";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isTokenAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`) return true;
  return false;
}

async function isSessionOwner(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return false;
  await connectToDatabase();
  const group = await GroupModel.findOne({ name: "LLM Arena" }).lean();
  if (!group) return false;
  return group.ownerId.toString() === userId;
}

export async function GET(request: NextRequest) {
  const tokenAuth = isTokenAuthorized(request);
  const wantsStream = request.headers.get("accept") === "text/event-stream";

  if (!tokenAuth) {
    if (wantsStream) {
      const sessionOk = await isSessionOwner();
      if (!sessionOk) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!wantsStream) {
    try {
      await ensureLlmArena();
      const result = await runLlmTick();
      return NextResponse.json(result);
    } catch (error) {
      console.error("LLM tick error:", error);
      return NextResponse.json({ error: "Internal error", detail: String(error) }, { status: 500 });
    }
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (event: string, data: string) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
  };

  (async () => {
    try {
      await ensureLlmArena();
      const result = await runLlmTick((msg) => {
        send("progress", msg).catch(() => {});
      });
      await send("result", JSON.stringify(result));
    } catch (error) {
      console.error("LLM tick error:", error);
      await send("error", String(error));
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isTokenAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureLlmArena();
    const result = await runLlmTick();
    return NextResponse.json(result);
  } catch (error) {
    console.error("LLM tick error:", error);
    return NextResponse.json({ error: "Internal error", detail: String(error) }, { status: 500 });
  }
}
