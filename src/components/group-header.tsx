"use client";

import Link from "next/link";
import { useState } from "react";
import {
  joinGroupAction,
  leaveGroupAction,
  requestJoinGroupAction,
  updateGroupAction,
  approveJoinRequestAction,
  denyJoinRequestAction,
  deleteGroupAction,
} from "@/app/actions";

type Member = {
  userId: string;
  name: string;
  role: string;
  initials: string;
};

type PendingRequest = {
  id: string;
  userId: string;
  name: string;
  initials: string;
  createdAt: string | null;
};

type Props = {
  group: {
    id: string;
    name: string;
    visibility: "public" | "private";
    ownerId: string;
    isMember: boolean;
  };
  isOwner: boolean;
  myPendingRequest: boolean;
  members: Member[];
  pendingRequests: PendingRequest[];
  infoMessage: string;
};

export function GroupHeader({ group, isOwner, myPendingRequest, members, pendingRequests, infoMessage }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const isPrivate = group.visibility === "private";

  return (
    <section className="rounded-2xl border border-border bg-white shadow-[var(--card-shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:gap-4 sm:p-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{group.name}</h1>
            {isPrivate ? (
              <span className="rounded-lg bg-foreground-tertiary/20 px-2 py-0.5 text-xs font-semibold text-foreground-secondary">Private</span>
            ) : (
              <span className="rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand-dark">Public</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMembersOpen((v) => !v)}
            className="mt-1 text-sm text-foreground-tertiary transition hover:text-brand-dark"
          >
            {members.length} {members.length === 1 ? "member" : "members"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!group.isMember ? (
            isPrivate ? (
              myPendingRequest ? (
                <span className="rounded-xl bg-foreground-tertiary/20 px-4 py-2 text-sm font-medium text-foreground-secondary">Request pending</span>
              ) : (
                <form action={requestJoinGroupAction}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <button className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover">Request to join</button>
                </form>
              )
            ) : (
              <form action={joinGroupAction}>
                <input type="hidden" name="groupId" value={group.id} />
                <button className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover">Join group</button>
              </form>
            )
          ) : !isOwner ? (
            <form action={leaveGroupAction}>
              <input type="hidden" name="groupId" value={group.id} />
              <button className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:border-decrease hover:text-decrease">Leave group</button>
            </form>
          ) : null}

          {isOwner ? (
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${settingsOpen ? "border-brand bg-brand/10 text-brand-dark" : "border-border text-foreground-tertiary hover:border-brand hover:text-brand-dark"}`}
              title="Group settings"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* Members dropdown */}
      {membersOpen ? (
        <div className="border-t border-border px-4 pb-5 pt-4 sm:px-6">
          <div className="grid max-h-[20rem] gap-2 overflow-y-auto pr-1">
            {members.map((member) => (
              <div key={member.userId} className="flex items-center gap-3 rounded-xl border border-border-light p-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand-dark">
                  {member.initials}
                </div>
                <div>
                  <Link href={`/users/${member.userId}`} className="text-sm font-medium text-brand-dark hover:underline">
                    {member.name}
                  </Link>
                  <p className="text-xs text-foreground-tertiary">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {infoMessage ? (
        <p className={`mx-4 sm:mx-6 ${membersOpen ? "mt-0" : ""} mb-4 rounded-xl bg-brand/10 p-3 text-sm text-brand-dark`}>{infoMessage}</p>
      ) : null}

      {/* Owner settings panel */}
      {isOwner && settingsOpen ? (
        <div className="border-t border-border px-4 pb-6 pt-5 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-tertiary">Settings</h2>
              <form action={updateGroupAction} className="mt-3 grid gap-3">
                <input type="hidden" name="groupId" value={group.id} />
                <div>
                  <label className="text-sm font-medium text-foreground-secondary">Name</label>
                  <input name="name" defaultValue={group.name} required className="mt-1 w-full rounded-xl border border-border bg-background-secondary p-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground-secondary">Visibility</label>
                  <select name="visibility" defaultValue={group.visibility} className="mt-1 w-full rounded-xl border border-border bg-background-secondary p-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
                    <option value="public">Public — anyone can join</option>
                    <option value="private">Private — request to join</option>
                  </select>
                </div>
                <button className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover">Save changes</button>
              </form>
              <form
                action={deleteGroupAction}
                className="mt-4 border-t border-border-light pt-4"
                onSubmit={(e) => {
                  if (!confirm("Delete this group and all its markets, bets, and activity? This cannot be undone.")) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="groupId" value={group.id} />
                <button className="rounded-xl border border-decrease/30 px-4 py-2 text-sm font-medium text-decrease transition hover:bg-decrease/10">
                  Delete group
                </button>
              </form>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-tertiary">
                Join requests
                {pendingRequests.length > 0 ? (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-brand-dark">
                    {pendingRequests.length}
                  </span>
                ) : null}
              </h2>
              <div className="mt-3 grid max-h-[18rem] gap-2 overflow-y-auto pr-1">
                {pendingRequests.length === 0 ? (
                  <p className="text-sm text-foreground-tertiary">No pending requests.</p>
                ) : (
                  pendingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-xl border border-border-light p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand-dark">
                          {req.initials}
                        </div>
                        <div>
                          <Link href={`/users/${req.userId}`} className="text-sm font-medium text-brand-dark hover:underline">{req.name}</Link>
                          <p className="text-xs text-foreground-tertiary">{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ""}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <form action={approveJoinRequestAction}>
                          <input type="hidden" name="requestId" value={req.id} />
                          <button className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-brand-dark transition hover:bg-brand-hover">Approve</button>
                        </form>
                        <form action={denyJoinRequestAction}>
                          <input type="hidden" name="requestId" value={req.id} />
                          <button className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition hover:border-decrease hover:text-decrease">Deny</button>
                        </form>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
