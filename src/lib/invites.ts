import "server-only";
import { GroupInviteModel } from "@/models/GroupInvite";
import { generateInviteCode } from "@/lib/utils";

export type GroupInviteJoinMode = "auto" | "request";
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

function createInviteExpiryDate() {
  return new Date(Date.now() + INVITE_TTL_MS);
}

function isInviteUsable(invite: { isActive?: boolean; expiresAt?: Date | null; maxUses?: number | null; useCount?: number }) {
  if (!invite.isActive) return false;
  if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) return false;
  if (typeof invite.maxUses === "number" && (invite.useCount || 0) >= invite.maxUses) return false;
  return true;
}

export function getJoinModeFromVisibility(visibility: "public" | "private"): GroupInviteJoinMode {
  // Invite links are always auto-admit. Private approval is handled on group URLs.
  return "auto";
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
    const nextExpiresAt = existing.expiresAt || createInviteExpiryDate();
    const shouldUpdateJoinMode = (existing.joinMode || "auto") !== joinMode;
    const shouldUpdateExpiry = !existing.expiresAt;

    if (shouldUpdateJoinMode || shouldUpdateExpiry) {
      await GroupInviteModel.updateOne(
        { _id: existing._id },
        { $set: { joinMode, expiresAt: nextExpiresAt } },
      );
      return { ...existing, joinMode, expiresAt: nextExpiresAt };
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
    expiresAt: createInviteExpiryDate(),
  });
}

