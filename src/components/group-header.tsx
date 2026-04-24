"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { useState, useCallback } from "react";
import { DeadlineInput } from "@/components/deadline-input";
import { LocalDate } from "@/components/local-date";
import {
  joinGroupAction,
  leaveGroupAction,
  removeMemberAction,
  requestJoinGroupAction,
  updateGroupAction,
  approveJoinRequestAction,
  denyJoinRequestAction,
  deleteGroupAction,
  overrideModerationAction,
  dismissModerationLogAction,
  dismissAllModerationLogsAction,
} from "@/app/actions";
import { CreateMarketButton } from "@/components/create-market-modal";

type Member = {
  userId: string;
  name: string;
  role: string;
  initials: string;
  isBot?: boolean;
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
  createMarketMembers?: { userId: string; name: string }[];
  moderation?: {
    rejected: boolean;
    reason: string;
    logId: string | null;
    canOverride: boolean;
  };
  moderationLogs?: {
    id: string;
    question: string;
    verdict: string;
    reason: string;
    userName: string;
    createdAt: string | null;
  }[];
  isLlmArena?: boolean;
};

function ModerationLogEntry({ log, members, onDismiss }: {
  log: Props["moderationLogs"] extends (infer T)[] | undefined ? T : never;
  members: Member[];
  onDismiss: (formData: FormData) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const isRejected = log.verdict === "rejected";

  return (
    <div className="rounded-xl border border-border-light p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">&ldquo;{log.question}&rdquo;</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${log.verdict === "overridden" ? "bg-amber-100 text-amber-700" : "bg-decrease/10 text-decrease"}`}>
            {log.verdict === "overridden" ? "Overridden" : "Rejected"}
          </span>
          <form action={onDismiss}>
            <input type="hidden" name="logId" value={log.id} />
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-tertiary transition hover:bg-background-secondary hover:text-foreground-secondary"
              aria-label="Dismiss"
              title="Dismiss"
            >
              &times;
            </button>
          </form>
        </div>
      </div>
      <p className="mt-1 text-foreground-secondary">{log.reason}</p>
      <p className="mt-1 text-xs text-foreground-tertiary">
        By {log.userName} · {log.createdAt ? <LocalDate iso={log.createdAt} style="date" /> : ""}
      </p>
      {isRejected ? (
        showForm ? (
          <form action={overrideModerationAction} className="mt-3 grid gap-2 border-t border-border-light pt-3">
            <input type="hidden" name="logId" value={log.id} />
            <DeadlineInput
              required
              className="rounded-xl border border-border bg-background-secondary p-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <select
              name="umpireId"
              required
              defaultValue=""
              className="rounded-xl border border-border bg-background-secondary p-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="" disabled>Select Umpire</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition hover:bg-background-secondary"
              >
                Cancel
              </button>
              <button className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600">
                Override &amp; create
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-2 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
          >
            Approve anyway
          </button>
        )
      ) : null}
    </div>
  );
}

export function GroupHeader({ group, isOwner, myPendingRequest, members, pendingRequests, infoMessage, createMarketMembers, moderation, moderationLogs, isLlmArena }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [tickRunning, setTickRunning] = useState(false);
  const [tickStatus, setTickStatus] = useState("");
  const isPrivate = group.visibility === "private";
  const [optimisticLogs, removeLog] = useOptimistic(
    moderationLogs || [],
    (current: NonNullable<Props["moderationLogs"]>, logIdToRemove: string | null) =>
      logIdToRemove === null ? [] : current.filter((l) => l.id !== logIdToRemove),
  );
  const [, startTransition] = useTransition();

  return (
    <section className="rounded-2xl border border-border bg-white shadow-[var(--card-shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:gap-4 sm:p-6">
        <div>
          <div className="flex items-center gap-3">
            {isLlmArena ? (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="8" width="18" height="12" rx="2" />
                  <path strokeLinecap="round" d="M12 8V5m-4 7h.01M16 12h.01M9 16h6" />
                  <circle cx="12" cy="5" r="1" fill="currentColor" />
                </svg>
              </span>
            ) : null}
            <h1 className="text-2xl font-bold">{group.name}</h1>
            {isPrivate ? (
              <span className="rounded-lg bg-foreground-tertiary/20 px-2 py-0.5 text-xs font-semibold text-foreground-secondary">Private</span>
            ) : isLlmArena ? (
              <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-600">AI-Powered</span>
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
          {group.isMember && createMarketMembers ? (
            <CreateMarketButton groupId={group.id} members={createMarketMembers} moderation={moderation} />
          ) : null}
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

          {isOwner && isLlmArena ? (
            <button
              disabled={tickRunning}
              onClick={async () => {
                if (tickRunning) return;
                setTickRunning(true);
                setTickStatus("Starting…");
                try {
                  const res = await fetch("/api/llm-tick", {
                    headers: { Accept: "text/event-stream" },
                  });
                  if (!res.ok || !res.body) throw new Error("Request failed");
                  const reader = res.body.getReader();
                  const decoder = new TextDecoder();
                  let buffer = "";
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";
                    for (const line of lines) {
                      if (line.startsWith("data: ") && !line.includes('"actions"')) {
                        setTickStatus(line.slice(6));
                      }
                    }
                  }
                } catch (e) {
                  console.error("Tick error:", e);
                  setTickStatus("Error");
                } finally {
                  setTickRunning(false);
                  setTimeout(() => setTickStatus(""), 3000);
                  window.location.reload();
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-violet-300 bg-violet-50 px-3.5 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
            >
              {tickRunning ? (
                <svg className="h-4 w-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="truncate">{tickRunning && tickStatus ? tickStatus : tickRunning ? "Running…" : "Trigger tick"}</span>
            </button>
          ) : null}

          {isOwner ? (
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition ${settingsOpen ? "border-brand bg-brand/10 text-brand-dark" : "border-border text-foreground-tertiary hover:border-brand hover:text-brand-dark"}`}
              title="Group settings"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {pendingRequests.length > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-brand-dark">
                  {pendingRequests.length > 9 ? "9+" : pendingRequests.length}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      </div>

      {/* Members dropdown */}
      {membersOpen ? (
        <div className="border-t border-border px-4 pb-5 pt-4 sm:px-6">
          <div className="grid max-h-[20rem] gap-2 overflow-y-auto pr-1">
            {members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between gap-3 rounded-xl border border-border-light p-2.5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${member.isBot ? "bg-violet-100 text-violet-600" : "bg-brand/10 text-brand-dark"}`}>
                    {member.isBot ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="8" width="18" height="12" rx="2" />
                        <path strokeLinecap="round" d="M12 8V5m-4 7h.01M16 12h.01M9 16h6" />
                        <circle cx="12" cy="5" r="1" fill="currentColor" />
                      </svg>
                    ) : member.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Link href={`/users/${member.userId}`} className="text-sm font-medium text-brand-dark hover:underline">
                        {member.name}
                      </Link>
                      {member.isBot ? (
                        <span className="inline-flex items-center rounded-full bg-violet-100 p-1 text-violet-600" title="Bot">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><rect x="3" y="8" width="18" height="12" rx="2" /><path strokeLinecap="round" d="M12 8V5m-4 7h.01M16 12h.01M9 16h6" /><circle cx="12" cy="5" r="1" fill="currentColor" /></svg>
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-foreground-tertiary">{member.role}</p>
                  </div>
                </div>
                {isOwner && member.role !== "owner" ? (
                  <form
                    action={removeMemberAction}
                    onSubmit={(e) => {
                      if (!confirm(`Remove ${member.name} from the group?`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="memberUserId" value={member.userId} />
                    <button className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition hover:border-decrease hover:text-decrease">
                      Remove
                    </button>
                  </form>
                ) : null}
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
                          <p className="text-xs text-foreground-tertiary">{req.createdAt ? <LocalDate iso={req.createdAt} style="date" /> : ""}</p>
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
          </div>

          {optimisticLogs.length > 0 ? (
            <div className="mt-6 border-t border-border pt-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-tertiary">
                  Moderation log
                </h2>
                <form action={(formData) => {
                  startTransition(async () => {
                    removeLog(null);
                    await dismissAllModerationLogsAction(formData);
                  });
                }}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <button className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary transition hover:border-decrease hover:text-decrease">
                    Dismiss all
                  </button>
                </form>
              </div>
              <div className="mt-3 grid max-h-[18rem] gap-2 overflow-y-auto pr-1">
                {optimisticLogs.map((log) => (
                  <ModerationLogEntry
                    key={log.id}
                    log={log}
                    members={members}
                    onDismiss={(formData) => {
                      startTransition(async () => {
                        removeLog(log.id);
                        await dismissModerationLogAction(formData);
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
