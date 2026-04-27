"use client";

import { BetShareImageSheet } from "@/components/bet-share-image-sheet";
import type { BetShareVisualProps } from "@/components/bet-share-visual-types";

export type BetSharePopupProps = {
  marketAbsoluteUrl: string;
  visual: BetShareVisualProps;
  onClose: () => void;
};

export function BetSharePopup({ marketAbsoluteUrl, visual, onClose }: BetSharePopupProps) {
  return (
    <BetShareImageSheet
      title="Share your bet!"
      marketAbsoluteUrl={marketAbsoluteUrl}
      visual={visual}
      onClose={onClose}
    />
  );
}
