import "server-only";
import { GroupInviteModel } from "@/models/GroupInvite";
import { generateInviteCode } from "@/lib/utils";

export type GroupInviteJoinMode = "auto" | "request";

function isInviteUsable(invite: { isActive?: boolean; expiresAt?: Date | null; maxUses?: number | null; useCount?: number }) {
  if (!invite.isActive) return false;
  if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) return false;
  if (typeof invite.maxUses === "number" && (invite.useCount || 0) >= invite.maxUses) return false;
  return true;
}

export function getJoinModeFromVisibility(visibility: "public" | "private"): GroupInviteJoinMode {
  return visibility === "private" ? "request" : "auto";
}

async function createUniqueInviteCode() {
  for (let i = 0; i < 8; i += 1) {
    const code = generateInviteCode();
    const exists = await GroupInviteModel.exists({ code });
    if (!exists) return code;
  }
  throw new Error("Unable to generate unique invite code.");
}

export async function getOrCreateActiveGroupInvite(
  groupId: string,
  createdById: string,
  joinMode: GroupInviteJoinMode,
) {
  const existing = await GroupInviteModel.findOne({ groupId, isActive: true })
    .sort({ createdAt: -1 })
    .lean();
  if (existing && isInviteUsable(existing)) {
    if ((existing.joinMode || "auto") !== joinMode) {
      await GroupInviteModel.updateOne({ _id: existing._id }, { $set: { joinMode } });
      return { ...existing, joinMode };
    }
    return existing;
  }

  const code = await createUniqueInviteCode();
  return GroupInviteModel.create({
    groupId,
    createdById,
    code,
    joinMode,
    isActive: true,
    useCount: 0,
    maxUses: null,
    expiresAt: null,
  });
}

