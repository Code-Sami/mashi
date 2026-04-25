"use client";

import { createGroupAction } from "@/app/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type GroupEntry = {
  id: string;
  name: string;
  visibility: "public" | "private";
  memberCount: number;
};

const LockIcon = () => (
  <svg className="h-3.5 w-3.5 text-foreground-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export function GroupsDirectory({ groups }: { groups: GroupEntry[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinInvite, setShowJoinInvite] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inviteInputRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? groups.filter((g) => g.name.toLowerCase().includes(search.trim().toLowerCase()))
    : groups;

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-white p-6 shadow-[var(--card-shadow)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Groups</h1>
            <p className="mt-1 text-sm text-foreground-secondary">Create a group, share the invite link, and start making markets with friends.</p>
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
              placeholder="Search your groups..."
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
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-border text-foreground-secondary transition hover:border-brand hover:text-brand-dark"
            title="Create group"
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
              <option value="public">Anyone with invite link can join</option>
              <option value="private">Require approval to join</option>
            </select>
            <button className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover">
              Create
            </button>
          </form>
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

        <div className="mt-4 grid gap-2">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-foreground-tertiary">
              {search.trim() ? "No groups match your search." : "You are not in any groups yet."}
            </p>
          ) : (
            filtered.map((group) => (
              <div key={group.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 transition hover:border-brand/40">
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
                <div className="flex gap-2">
                  <Link href={`/groups/${group.id}`} className="rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:border-brand">
                    Open
                  </Link>
                  <span className="rounded-xl bg-brand/10 px-3 py-2 text-sm font-medium text-brand-dark">Member</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
