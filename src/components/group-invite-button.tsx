"use client";

import { useState } from "react";

type Props = {
  inviteUrl: string;
  groupName: string;
  joinMode: "auto" | "request";
};

export function GroupInviteButton({ inviteUrl, groupName, joinMode }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const helperText =
    joinMode === "auto"
      ? "Anyone with this link can join this group."
      : "Anyone with this link can request to join. The owner approves requests.";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:border-brand hover:text-brand-dark"
      >
        Invite Friends
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-border bg-white p-3 shadow-xl">
          <p className="text-sm font-semibold">{groupName}</p>
          <p className="mt-1 text-xs text-foreground-secondary">{helperText}</p>
          <input
            value={inviteUrl}
            readOnly
            className="mt-3 w-full rounded-lg border border-border bg-background-secondary p-2 text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-dark transition hover:bg-brand-hover"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            {"share" in navigator ? (
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-background-secondary"
                onClick={async () => {
                  await navigator.share({ title: `${groupName} invite`, text: `Join my group on Mashi: ${groupName}`, url: inviteUrl });
                }}
              >
                Share
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

