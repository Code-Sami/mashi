"use client";

import { deleteMarketAction } from "@/app/actions";

type Props = {
  marketId: string;
  question: string;
};

export function DeleteMarketButton({ marketId, question }: Props) {
  return (
    <form
      action={deleteMarketAction}
      onSubmit={(e) => {
        if (!confirm(`Delete "${question}"? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="marketId" value={marketId} />
      <button className="rounded-xl border border-decrease/30 px-4 py-2 text-sm font-medium text-decrease transition hover:bg-decrease/10">
        Delete market
      </button>
    </form>
  );
}
