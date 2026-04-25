import Link from "next/link";
import { acceptGroupInviteAction } from "@/app/actions";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthUserOrNull } from "@/lib/session";
import { GroupModel } from "@/models/Group";
import { GroupInviteModel } from "@/models/GroupInvite";
import { GroupMemberModel } from "@/models/GroupMember";

type PageProps = {
  params: Promise<{ code: string }>;
};

function isInviteValid(invite: {
  isActive?: boolean;
  expiresAt?: Date | null;
  maxUses?: number | null;
  useCount?: number;
}) {
  if (!invite || invite.isActive !== true) return false;
  if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) return false;
  if (typeof invite.maxUses === "number" && (invite.useCount || 0) >= invite.maxUses) return false;
  return true;
}

export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;
  await connectToDatabase();

  const invite = await GroupInviteModel.findOne({ code }).lean();
  const validInvite = invite && isInviteValid(invite);
  const group = validInvite ? await GroupModel.findById(invite.groupId, { name: 1 }).lean() : null;

  if (!validInvite || !group) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-white p-8 text-center shadow-[var(--card-shadow)]">
        <h1 className="text-2xl font-bold">Invite link unavailable</h1>
        <p className="mt-2 text-sm text-foreground-secondary">
          This invite link is invalid, expired, or no longer active.
        </p>
        <Link href="/groups" className="mt-4 inline-block rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover">
          Go to My Groups
        </Link>
      </div>
    );
  }

  const user = await getAuthUserOrNull();
  const returnTo = `/invite/${code}`;

  if (!user) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-white p-8 shadow-[var(--card-shadow)]">
        <h1 className="text-2xl font-bold">You are invited to join {group.name}</h1>
        <p className="mt-2 text-sm text-foreground-secondary">
          Sign up or log in to continue with this invite.
        </p>
        <div className="mt-5 flex gap-2">
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(returnTo)}`}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover"
          >
            Log in
          </Link>
          <Link
            href={`/signup?callbackUrl=${encodeURIComponent(returnTo)}`}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-brand hover:text-brand-dark"
          >
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const isMember = Boolean(await GroupMemberModel.exists({ groupId: group._id, userId: user._id }));
  if (isMember) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-white p-8 shadow-[var(--card-shadow)]">
        <h1 className="text-2xl font-bold">You are already in this group</h1>
        <p className="mt-2 text-sm text-foreground-secondary">{group.name} is ready for you.</p>
        <Link href={`/groups/${group._id.toString()}`} className="mt-4 inline-block rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover">
          Open group
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-white p-8 shadow-[var(--card-shadow)]">
      <h1 className="text-2xl font-bold">Join {group.name}</h1>
      <p className="mt-2 text-sm text-foreground-secondary">
        Join group with this invite link.
      </p>
      <form action={acceptGroupInviteAction} className="mt-5">
        <input type="hidden" name="code" value={code} />
        <button className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover">
          Join group
        </button>
      </form>
    </div>
  );
}

