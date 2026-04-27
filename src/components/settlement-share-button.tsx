"use client";

import { BetShareImageSheet } from "@/components/bet-share-image-sheet";
import type { BetShareVisualProps } from "@/components/bet-share-visual-types";
import { useState } from "react";

type SettlementShareButtonProps = {
  marketAbsoluteUrl: string;
  visual: BetShareVisualProps;
  label: string;
  variant?: "primary" | "outline";
};

export function SettlementShareButton({
  marketAbsoluteUrl,
  visual,
  label,
  variant = "primary",
}: SettlementShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "primary"
            ? "flex w-full items-center justify-center rounded-xl bg-brand py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover"
            : "flex w-full items-center justify-center rounded-xl border border-border py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-background-secondary"
        }
      >
        {label}
      </button>
      {open ? (
        <BetShareImageSheet
          title="Share your result"
          marketAbsoluteUrl={marketAbsoluteUrl}
          visual={visual}
          shareLinkPhrasing="view"
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
