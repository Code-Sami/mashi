import { NextRequest, NextResponse } from "next/server";
import { requireApiUserId } from "@/lib/mobile-api";
import { getGroupsDirectoryData } from "@/lib/queries";

export const dynamic = "force-dynamic";

function mapRow(row: {
  id: string;
  name: string;
  visibility: "public" | "private";
  memberCount: number;
  isMember: boolean;
  hasPendingRequest: boolean;
}) {
  return {
    id: row.id,
    name: row.name,
    description: "",
    visibility: row.visibility,
    memberCount: row.memberCount,
    isMember: row.isMember,
    hasPendingRequest: row.hasPendingRequest,
  };
}

export async function GET(request: NextRequest) {
  const userId = await requireApiUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getGroupsDirectoryData(userId);
  return NextResponse.json({
    myGroups: data.myGroups.map(mapRow),
    publicGroups: data.publicGroups.map(mapRow),
  });
}
