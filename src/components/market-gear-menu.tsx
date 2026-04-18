"use client";

import { useState, useRef, useEffect } from "react";
import { resolveMarketAction, deleteMarketAction } from "@/app/actions";

type MarketGearMenuProps = {
  marketId: string;
  question: string;
  status: "open" | "resolved";
  hasBets: boolean;
};

export function MarketGearMenu({ marketId, question, status, hasBets }: MarketGearMenuProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "resolve">("menu");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView("menu");
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
          setView("menu");
        }}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-tertiary transition hover:bg-background-secondary hover:text-foreground-secondary"
        title="Market settings"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-border bg-white p-1.5 shadow-lg"
          onClick={(e) => { e.stopPropagation(); }}
        >
          {view === "menu" ? (
            <>
              {status === "open" ? (
                <button
                  type="button"
                  onClick={() => setView("resolve")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-background-secondary"
                >
                  <svg className="h-4 w-4 text-foreground-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Resolve market
                </button>
              ) : null}
              {!hasBets ? (
                <form
                  action={deleteMarketAction}
                  onSubmit={(e) => {
                    if (!confirm(`Delete "${question}"? This cannot be undone.`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="marketId" value={marketId} />
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-decrease transition hover:bg-decrease/5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    Delete market
                  </button>
                </form>
              ) : null}
              {status !== "open" && hasBets ? (
                <p className="px-3 py-2 text-xs text-foreground-tertiary">No actions available for this market.</p>
              ) : null}
            </>
          ) : (
            <div className="p-1.5">
              <p className="mb-2 text-xs font-semibold text-foreground-secondary">Resolve as:</p>
              <div className="grid grid-cols-2 gap-1.5">
                <form action={resolveMarketAction}>
                  <input type="hidden" name="marketId" value={marketId} />
                  <input type="hidden" name="outcome" value="yes" />
                  <button className="w-full rounded-lg bg-yes px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                    YES
                  </button>
                </form>
                <form action={resolveMarketAction}>
                  <input type="hidden" name="marketId" value={marketId} />
                  <input type="hidden" name="outcome" value="no" />
                  <button className="w-full rounded-lg bg-no px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                    NO
                  </button>
                </form>
              </div>
              <button
                type="button"
                onClick={() => setView("menu")}
                className="mt-1.5 w-full rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-tertiary transition hover:bg-background-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
