import { NextRequest, NextResponse } from "next/server";
import { requireApiUserId } from "@/lib/mobile-api";
import { getPublicUserProfileData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const viewerUserId = await requireApiUserId(request.headers);
  if (!viewerUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const profile = await getPublicUserProfileData(userId, viewerUserId);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: profile.user.id,
      name: profile.user.name,
      email: profile.user.email,
      avatarURL: profile.user.avatarUrl || null,
      initials: profile.user.initials,
    },
    stats: {
      betsPlaced: profile.stats.betsPlaced,
      resolvedBets: profile.stats.resolvedBets,
      marketsCreated: profile.stats.marketsCreated,
      net: profile.stats.net,
    },
  });
}
