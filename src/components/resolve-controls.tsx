"use client";

import { resolveMarketAction } from "@/app/actions";
import { useState } from "react";

type ResolveControlsProps = {
  marketId: string;
};

export function ResolveControls({ marketId }: ResolveControlsProps) {
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-secondary">
          You&apos;re the umpire for this market.
        </p>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover"
        >
          Ready to resolve?
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="font-semibold">Resolve this market</p>
        <p className="mt-1 text-sm text-foreground-secondary">
          This action is permanent and cannot be undone.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <form action={resolveMarketAction}>
          <input type="hidden" name="marketId" value={marketId} />
          <input type="hidden" name="outcome" value="yes" />
          <button className="w-full rounded-xl bg-yes px-3 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
            Resolve YES
          </button>
        </form>
        <form action={resolveMarketAction}>
          <input type="hidden" name="marketId" value={marketId} />
          <input type="hidden" name="outcome" value="no" />
          <button className="w-full rounded-xl bg-no px-3 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
            Resolve NO
          </button>
        </form>
      </div>
      <button
        type="button"
        onClick={() => setRevealed(false)}
        className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground-secondary transition hover:bg-background-secondary"
      >
        Cancel
      </button>
    </div>
  );
}
