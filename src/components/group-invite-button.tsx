"use client";

import { useState } from "react";
import { getFreshGroupInviteUrlAction } from "@/app/actions";

type Props = {
  shareUrl: string;
  groupName: string;
  groupId?: string;
  refreshOnOpen?: boolean;
  buttonLabel?: string;
  helperText: string;
};

export function GroupInviteButton({
  shareUrl,
  groupName,
  groupId,
  refreshOnOpen = false,
  helperText,
  buttonLabel = "Invite Friends",
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resolvedShareUrl, setResolvedShareUrl] = useState(shareUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function toggleOpen() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (!refreshOnOpen || !groupId) return;

    setIsRefreshing(true);
    try {
      const freshUrl = await getFreshGroupInviteUrlAction(groupId);
      setResolvedShareUrl(freshUrl);
    } catch {
      // Keep the previous URL visible if refresh fails.
      setResolvedShareUrl(shareUrl);
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:border-brand hover:text-brand-dark"
      >
        {buttonLabel}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-border bg-white p-3 shadow-xl">
          <p className="text-sm font-semibold">{groupName}</p>
          <p className="mt-1 text-xs text-foreground-secondary">{helperText}</p>
          <input
            value={resolvedShareUrl}
            readOnly
            className="mt-3 w-full rounded-lg border border-border bg-background-secondary p-2 text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          {isRefreshing ? (
            <p className="mt-1 text-[11px] text-foreground-tertiary">Refreshing invite link...</p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-dark transition hover:bg-brand-hover"
              onClick={async () => {
                await navigator.clipboard.writeText(resolvedShareUrl);
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
                  await navigator.share({ title: `${groupName} link`, text: `Join my group on Mashi: ${groupName}`, url: resolvedShareUrl });
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

