import Link from "next/link";
import { acceptGroupInviteAction } from "@/app/actions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthUserOrNull } from "@/lib/session";
import { ActivityModel } from "@/models/Activity";
import { GroupModel } from "@/models/Group";
import { GroupInviteModel } from "@/models/GroupInvite";
import { GroupMemberModel } from "@/models/GroupMember";
import { JoinRequestModel } from "@/models/JoinRequest";

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

  // Auto-join when a logged-in user lands on a valid invite link.
  await GroupMemberModel.create({ groupId: group._id, userId: user._id, role: "member" });
  await GroupInviteModel.updateOne({ _id: invite._id }, { $inc: { useCount: 1 } });
  await ActivityModel.create({
    groupId: group._id,
    actorUserId: user._id,
    type: "member_joined",
    metadata: { via: "invite_link" },
  });
  await JoinRequestModel.deleteMany({ groupId: group._id, userId: user._id, status: "pending" });
  revalidatePath("/groups");
  revalidatePath(`/groups/${group._id.toString()}`);
  redirect(`/groups/${group._id.toString()}?joined=1`);
}

