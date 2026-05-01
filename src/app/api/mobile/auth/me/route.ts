import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { fullName, requireApiUserId } from "@/lib/mobile-api";
import { UserModel } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const user = await UserModel.findById(userId).lean();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    id: user._id.toString(),
    displayName: fullName(user),
    username: user.username || null,
    avatarURL: user.avatarUrl || null,
  });
}
