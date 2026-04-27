"use client";

import { BetShareToolbar } from "@/components/bet-share-toolbar";
import { BetShareVisual } from "@/components/bet-share-visual";
import type { BetShareVisualProps } from "@/components/bet-share-visual-types";
import { useEffect, useRef } from "react";

export type BetShareImageSheetProps = {
  title: string;
  subtitle?: string;
  /** Absolute URL to the market page (included when sharing the image). */
  marketAbsoluteUrl: string;
  visual: BetShareVisualProps;
  onClose: () => void;
  /** Settlement result shares use “View this market…”; default is post-bet “Join…” */
  shareLinkPhrasing?: "join" | "view";
};

export function BetShareImageSheet({
  title,
  subtitle,
  marketAbsoluteUrl,
  visual,
  onClose,
  shareLinkPhrasing = "join",
}: BetShareImageSheetProps) {
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="bet-share-sheet-title"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-background-secondary p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p id="bet-share-sheet-title" className="text-lg font-bold text-foreground">
              {title}
            </p>
            {subtitle ? <p className="mt-0.5 text-sm text-foreground-secondary">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-foreground-tertiary hover:bg-white hover:text-foreground"
          >
            Done
          </button>
        </div>

        {/* Margin stays outside captureRef — margins on the captured root become blank strips in PNG exports */}
        <div className="mt-4">
          <div ref={captureRef} className="m-0 block p-0 leading-none">
            <BetShareVisual {...visual} />
          </div>
        </div>

        <div className="mt-5">
          <BetShareToolbar
            marketAbsoluteUrl={marketAbsoluteUrl}
            captureRef={captureRef}
            linkPhrasing={shareLinkPhrasing}
          />
        </div>
      </div>
    </div>
  );
}
