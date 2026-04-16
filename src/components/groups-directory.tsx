"use client";

import { createGroupAction, joinGroupAction, requestJoinGroupAction } from "@/app/actions";
import Link from "next/link";
import { useRef, useState } from "react";

type GroupEntry = {
  id: string;
  name: string;
  visibility: "public" | "private";
  memberCount: number;
  isMember: boolean;
  hasPendingRequest: boolean;
};

const LockIcon = () => (
  <svg className="h-3.5 w-3.5 text-foreground-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export function GroupsDirectory({ groups }: { groups: GroupEntry[] }) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? groups.filter((g) => g.name.toLowerCase().includes(search.trim().toLowerCase()))
    : groups;

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-white p-6 shadow-[var(--card-shadow)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Groups</h1>
            <p className="mt-1 text-sm text-foreground-secondary">Browse and join public groups, or create your own.</p>
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
          <button
            type="button"
            onClick={() => {
              setShowCreate((prev) => !prev);
              if (!showCreate) {
                requestAnimationFrame(() => inputRef.current?.focus());
              }
            }}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand text-brand-dark transition hover:bg-brand-hover"
            title="Create new group"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {showCreate ? (
          <form action={createGroupAction} className="mt-3 flex gap-2">
            <input
              ref={inputRef}
              name="name"
              required
              placeholder="New group name"
              className="flex-1 rounded-xl border border-border bg-background-secondary p-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <select
              name="visibility"
              defaultValue="public"
              className="rounded-xl border border-border bg-background-secondary p-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            <button className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover">
              Create
            </button>
          </form>
        ) : null}

        <div className="mt-4 grid gap-2">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-foreground-tertiary">
              {search.trim() ? "No groups match your search." : "No groups yet."}
            </p>
          ) : (
            filtered.map((group) => (
              <div key={group.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 transition hover:border-brand/40">
                <div>
                  <div className="flex items-center gap-1.5">
                    {group.visibility === "private" ? <LockIcon /> : null}
                    <p className="font-medium">{group.name}</p>
                  </div>
                  <p className="text-xs text-foreground-tertiary">{group.memberCount} members</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/groups/${group.id}`} className="rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:border-brand">
                    View
                  </Link>
                  {group.isMember ? (
                    <span className="rounded-xl bg-brand/10 px-3 py-2 text-sm font-medium text-brand-dark">Joined</span>
                  ) : group.hasPendingRequest ? (
                    <span className="rounded-xl bg-foreground-tertiary/20 px-3 py-2 text-sm font-medium text-foreground-secondary">Pending</span>
                  ) : group.visibility === "private" ? (
                    <form action={requestJoinGroupAction}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <button className="rounded-xl border border-brand bg-brand/10 px-3 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand/20">Request</button>
                    </form>
                  ) : (
                    <form action={joinGroupAction}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <button className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover">Join</button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
