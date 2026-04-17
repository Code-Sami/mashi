"use client";

import { disputeResolutionAction, acceptResolutionAction } from "@/app/actions";
import { useState } from "react";

type DisputeControlsProps = {
  marketId: string;
  outcome: string;
  evidence: string;
};

export function DisputeControls({ marketId, outcome, evidence }: DisputeControlsProps) {
  const [confirming, setConfirming] = useState<"dispute" | "accept" | null>(null);

  if (confirming === "dispute") {
    return (
      <div className="grid gap-3">
        <div>
          <p className="font-semibold text-amber-700">Dispute this resolution?</p>
          <p className="mt-1 text-sm text-foreground-secondary">
            The market will revert to pending and be re-resolved automatically on the next tick.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setConfirming(null)}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground-secondary transition hover:bg-background-secondary"
          >
            Cancel
          </button>
          <form action={disputeResolutionAction}>
            <input type="hidden" name="marketId" value={marketId} />
            <button className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600">
              Confirm dispute
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (confirming === "accept") {
    return (
      <div className="grid gap-3">
        <div>
          <p className="font-semibold text-increase">Accept this resolution?</p>
          <p className="mt-1 text-sm text-foreground-secondary">
            This confirms the outcome as final. No further disputes will be possible.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setConfirming(null)}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground-secondary transition hover:bg-background-secondary"
          >
            Cancel
          </button>
          <form action={acceptResolutionAction}>
            <input type="hidden" name="marketId" value={marketId} />
            <button className="w-full rounded-xl bg-increase px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-increase/90">
              Confirm accept
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm text-foreground-secondary">
          You&apos;re the group owner. The AI resolved this market as{" "}
          <span className={`font-semibold ${outcome === "yes" ? "text-yes" : "text-no"}`}>
            {outcome.toUpperCase()}
          </span>.
        </p>
        {evidence ? (
          <p className="mt-1 text-xs text-foreground-tertiary">{evidence}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setConfirming("dispute")}
          className="rounded-xl border-2 border-amber-400 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
        >
          Dispute resolution
        </button>
        <button
          type="button"
          onClick={() => setConfirming("accept")}
          className="rounded-xl bg-increase px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-increase/90"
        >
          Accept resolution
        </button>
      </div>
    </div>
  );
}
