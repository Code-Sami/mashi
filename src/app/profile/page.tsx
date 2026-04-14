import { updateProfileAction } from "@/app/actions";
import { requireAuthUser } from "@/lib/session";
import { getInitials } from "@/lib/utils";

export default async function ProfilePage() {
  const user = await requireAuthUser();
  const fallbackParts = (user.displayName || user.name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = user.firstName || fallbackParts[0] || "";
  const lastName = user.lastName || fallbackParts.slice(1).join(" ") || (user.email || "member").split("@")[0];
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-white p-6 shadow-[var(--card-shadow)]">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-foreground-secondary">Manage your account details.</p>

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-border-light bg-background-secondary p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand-dark">
          {getInitials(fullName)}
        </div>
        <div>
          <p className="font-semibold">{fullName}</p>
          <p className="text-xs text-foreground-tertiary">{user.email}</p>
        </div>
      </div>

      <form action={updateProfileAction} className="mt-5 grid gap-3">
        <div>
          <label className="text-sm font-medium text-foreground-secondary">First name</label>
          <input name="firstName" defaultValue={firstName} className="mt-1 w-full rounded-xl border border-border bg-background-secondary p-2.5 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground-secondary">Last name</label>
          <input name="lastName" defaultValue={lastName} className="mt-1 w-full rounded-xl border border-border bg-background-secondary p-2.5 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground-secondary">Avatar URL (optional)</label>
          <input name="avatarUrl" defaultValue={user.avatarUrl || ""} className="mt-1 w-full rounded-xl border border-border bg-background-secondary p-2.5 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        </div>
        <button className="mt-1 rounded-xl bg-brand px-4 py-2.5 font-semibold text-brand-dark transition hover:bg-brand-hover">Save profile</button>
      </form>
    </div>
  );
}
