import type { Metadata } from "next";
import { updateProfileAction } from "@/app/actions";
import { UserAvatar } from "@/components/user-avatar";
import { requireAuthUser } from "@/lib/session";
import { ProfileSubmitButton } from "@/app/profile/submit-button";

export const metadata: Metadata = {
  title: "Mashi - Settings",
};

export default async function ProfilePage() {
  const user = await requireAuthUser();
  const fallbackParts = (user.displayName || user.name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = user.firstName || fallbackParts[0] || "";
  const lastName = user.lastName || fallbackParts.slice(1).join(" ") || (user.email || "member").split("@")[0];
  const fullName = `${firstName} ${lastName}`.trim();
  const umpireReminderEmailEnabled = user.umpireReminderEmailEnabled !== false;
  const joinRequestOwnerEmailEnabled = user.joinRequestOwnerEmailEnabled !== false;
  const joinRequestDecisionEmailEnabled = user.joinRequestDecisionEmailEnabled !== false;

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-white p-6 shadow-[var(--card-shadow)]">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-foreground-secondary">Manage your account details.</p>

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-border-light bg-background-secondary p-4">
        <UserAvatar
          name={fullName}
          avatarUrl={user.avatarUrl}
          sizeClassName="h-12 w-12"
          textClassName="text-sm"
        />
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
        <div className="rounded-xl border border-border-light bg-background-secondary/50 p-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="umpireReminderEmailEnabled"
              defaultChecked={umpireReminderEmailEnabled}
              className="mt-0.5 h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
            />
            <span>
              <span className="block text-sm font-medium text-foreground-secondary">Email me when a market I umpire has passed its deadline</span>
              <span className="mt-0.5 block text-xs text-foreground-tertiary">
                You will still receive in-app notifications. This setting only controls reminder emails.
              </span>
            </span>
          </label>
        </div>
        <div className="rounded-xl border border-border-light bg-background-secondary/50 p-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="joinRequestOwnerEmailEnabled"
              defaultChecked={joinRequestOwnerEmailEnabled}
              className="mt-0.5 h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
            />
            <span>
              <span className="block text-sm font-medium text-foreground-secondary">Email me when someone requests to join my group</span>
              <span className="mt-0.5 block text-xs text-foreground-tertiary">
                Useful for group owners/admins who review private group requests.
              </span>
            </span>
          </label>
        </div>
        <div className="rounded-xl border border-border-light bg-background-secondary/50 p-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="joinRequestDecisionEmailEnabled"
              defaultChecked={joinRequestDecisionEmailEnabled}
              className="mt-0.5 h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
            />
            <span>
              <span className="block text-sm font-medium text-foreground-secondary">Email me when my join request is approved or denied</span>
              <span className="mt-0.5 block text-xs text-foreground-tertiary">
                You will still see the decision in-app.
              </span>
            </span>
          </label>
        </div>
        <ProfileSubmitButton />
      </form>
    </div>
  );
}
