import "server-only";

function norm(id: string) {
  return id.trim().toLowerCase();
}

/**
 * Comma-separated Mongo user `_id` strings in `SUPER_ADMIN_USER_IDS`.
 * Those users pass all group-owner checks (UI + server actions) for every group.
 */
export function isSuperAdminUserId(userId: string): boolean {
  const raw = process.env.SUPER_ADMIN_USER_IDS?.trim();
  if (!raw) return false;
  const n = norm(userId);
  return raw
    .split(",")
    .map((s) => norm(s))
    .some((id) => id.length > 0 && id === n);
}

export function isEffectiveGroupOwner(actorUserId: string, groupOwnerId: string): boolean {
  if (isSuperAdminUserId(actorUserId)) return true;
  return norm(actorUserId) === norm(groupOwnerId);
}
