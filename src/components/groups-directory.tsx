"use client";

import { createGroupAction, joinGroupAction } from "@/app/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type GroupEntry = {
  id: string;
  name: string;
  visibility: "public" | "private";
  memberCount: number;
  hasPendingRequest: boolean;
};

const LockIcon = () => (
  <svg className="h-3.5 w-3.5 text-foreground-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

type GroupsPayload = {
  myGroups: GroupEntry[];
  publicGroups: GroupEntry[];
};

function GroupCard({
  group,
  action,
}: {
  group: GroupEntry;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 transition hover:border-brand/40">
      <div>
        <div className="flex items-center gap-1.5">
          {group.visibility === "private" ? <LockIcon /> : null}
          {group.name === "LLM Arena" ? (
            <span className="inline-flex items-center rounded-full bg-violet-100 p-1 text-violet-600" title={group.name}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="8" width="18" height="12" rx="2" />
                <path strokeLinecap="round" d="M12 8V5m-4 7h.01M16 12h.01M9 16h6" />
                <circle cx="12" cy="5" r="1" fill="currentColor" />
              </svg>
            </span>
          ) : null}
          <p className="font-medium">{group.name}</p>
        </div>
        <p className="text-xs text-foreground-tertiary">{group.memberCount} members</p>
      </div>
      <div className="flex gap-2">{action}</div>
    </div>
  );
}

export function GroupsDirectory({ groups }: { groups: GroupsPayload }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinInvite, setShowJoinInvite] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inviteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showCreate) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showCreate]);

  const term = search.trim().toLowerCase();
  const filteredMyGroups = term
    ? groups.myGroups.filter((g) => g.name.toLowerCase().includes(term))
    : groups.myGroups;
  const filteredPublicGroups = term
    ? groups.publicGroups.filter((g) => g.name.toLowerCase().includes(term))
    : groups.publicGroups;

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-white p-6 shadow-[var(--card-shadow)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Groups</h1>
            <p className="mt-1 hidden text-sm text-foreground-secondary sm:block">Create a group, share the invite link, and start making markets with friends.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowJoinInvite((prev) => !prev);
                requestAnimationFrame(() => inviteInputRef.current?.focus());
              }}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-brand hover:text-brand-dark"
            >
              Join with invite
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(true);
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover"
            >
              Create group
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups..."
              className="w-full rounded-xl border border-border bg-background-secondary py-2.5 pl-10 pr-3 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {showCreate ? (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
            onClick={() => setShowCreate(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-border bg-white p-4 shadow-xl sm:p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex flex-col">
                <span className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-foreground-tertiary/30" />
                <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Create group</h2>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-md px-2 py-1 text-sm text-foreground-tertiary transition hover:bg-background-secondary hover:text-foreground-secondary"
                  aria-label="Close create group modal"
                >
                  ✕
                </button>
              </div>
              </div>
              <form action={createGroupAction} className="grid gap-2">
                <input
                  ref={inputRef}
                  name="name"
                  required
                  placeholder="New group name"
                  className="w-full rounded-xl border border-border bg-background-secondary p-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                <select
                  name="visibility"
                  defaultValue="private"
                  className="w-full rounded-xl border border-border bg-background-secondary p-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="public">Public: Anyone can find and join this group</option>
                  <option value="private">Private: Unlisted, owner approval required</option>
                </select>
                <button className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover">
                  Create
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {showJoinInvite ? (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const raw = inviteInput.trim();
              if (!raw) return;
              const code = raw.includes("/invite/") ? raw.split("/invite/").pop()?.split(/[?#]/)[0] || "" : raw.replace(/[^a-zA-Z0-9_-]/g, "");
              if (!code) return;
              router.push(`/invite/${code}`);
            }}
          >
            <input
              ref={inviteInputRef}
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="Paste invite link or code"
              className="flex-1 rounded-xl border border-border bg-background-secondary p-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <button className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-brand hover:text-brand-dark">
              Open invite
            </button>
          </form>
        ) : null}

        <div className="mt-6 grid gap-6">
          <div className="grid gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-tertiary">My groups</h2>
            <p className="text-sm text-foreground-secondary">Groups you&apos;ve joined or created.</p>
            {filteredMyGroups.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-foreground-tertiary">
                {term ? "No matching groups in your memberships." : "You are not in any groups yet."}
              </p>
            ) : (
              filteredMyGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  action={(
                    <>
                      <Link href={`/groups/${group.id}`} className="rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:border-brand">
                        Open
                      </Link>
                      <span className="rounded-xl bg-brand/10 px-3 py-2 text-sm font-medium text-brand-dark">Member</span>
                    </>
                  )}
                />
              ))
            )}
          </div>

          <div className="grid gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-tertiary">Explore public groups</h2>
            <p className="text-sm text-foreground-secondary">Open groups anyone can join.</p>
            {filteredPublicGroups.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-foreground-tertiary">
                {term ? "No matching public groups." : "No public groups to explore right now."}
              </p>
            ) : (
              filteredPublicGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  action={(
                    <>
                      <Link href={`/groups/${group.id}`} className="rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:border-brand">
                        View
                      </Link>
                      <form action={joinGroupAction}>
                        <input type="hidden" name="groupId" value={group.id} />
                        <button className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover">
                          Join
                        </button>
                      </form>
                    </>
                  )}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
