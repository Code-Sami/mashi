import type {
  BetShareVisualProps,
  BetShareVisualHedgedProps,
} from "@/components/bet-share-visual-types";

export type { BetShareVisualProps } from "@/components/bet-share-visual-types";

function truncate(text: string, max: number) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Calendar date in the user’s locale — no time-of-day */
function formatDeadlineDateOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isHedged(props: BetShareVisualProps): props is BetShareVisualHedgedProps {
  return props.shareKind === "hedged";
}

export function BetShareVisual(props: BetShareVisualProps) {
  const {
    variant,
    displayName,
    question,
    yesPriceAfter,
    noPriceAfter,
    totalVolume,
    deadlineIso,
    resolvedAtIso,
    marketOutcome,
    payout,
    pnl,
  } = props;

  const hedged = isHedged(props);

  const headline =
    variant === "placed"
      ? hedged
        ? "Bet on both sides"
        : "Placed a bet"
      : variant === "won"
        ? "Won my bet"
        : variant === "lost"
          ? "Results"
          : "Broke even";

  const isResolved = variant !== "placed";
  const showResolvedOutcomePill =
    isResolved && (marketOutcome === "yes" || marketOutcome === "no");
  const resolutionDateIso = resolvedAtIso || deadlineIso;
  const closeDate = formatDeadlineDateOnly(
    isResolved ? resolutionDateIso : deadlineIso,
  );
  const closeLabel = variant === "placed" ? "Betting closes" : "Resolved";

  const pnlLine =
    variant === "won" && typeof pnl === "number"
      ? `+$${pnl.toFixed(2)}`
      : variant === "lost" && typeof pnl === "number"
        ? `−$${Math.abs(pnl).toFixed(2)}`
        : variant === "push"
          ? "$0.00"
          : null;

  const pnlColorClass =
    variant === "won"
      ? "text-increase"
      : variant === "lost"
        ? "text-decrease"
        : "text-foreground-secondary";

  const oddsPanel = (
    <div className="flex min-h-[4.75rem] flex-col rounded-xl border border-border bg-gradient-to-br from-background-secondary via-white to-[#f4fcf9] p-3 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]">
      <p className="text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground-tertiary">
        Implied odds
      </p>
      <div className="mt-2 flex items-stretch divide-x divide-border-light">
        <div className="flex flex-1 flex-col items-center justify-center px-2 py-1">
          <span className="text-[0.65rem] font-bold uppercase tracking-wide text-yes">Yes</span>
          <span className="mt-0.5 text-[1.375rem] font-black tabular-nums leading-none tracking-tight text-yes sm:text-2xl">
            {(yesPriceAfter * 100).toFixed(1)}
            <span className="text-base font-bold">%</span>
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-2 py-1">
          <span className="text-[0.65rem] font-bold uppercase tracking-wide text-no">No</span>
          <span className="mt-0.5 text-[1.375rem] font-black tabular-nums leading-none tracking-tight text-no sm:text-2xl">
            {(noPriceAfter * 100).toFixed(1)}
            <span className="text-base font-bold">%</span>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-none border border-border bg-gradient-to-br from-[#fafafa] to-white shadow-[var(--card-shadow)]">
      {/* Mashi brand band — always brand colors */}
      <div className="flex items-center justify-between bg-brand-dark px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-black text-brand-dark">
            M
          </span>
          <span className="text-sm font-bold text-white">Mashi</span>
        </div>
        {showResolvedOutcomePill ? (
          <span
            className={`rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wide text-white ${
              marketOutcome === "yes"
                ? "bg-yes ring-1 ring-white/25"
                : "bg-no ring-1 ring-white/25"
            }`}
          >
            Resolved: {marketOutcome === "yes" ? "YES" : "NO"}
          </span>
        ) : (
          <span className="rounded-lg bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-dark">
            {headline}
          </span>
        )}
      </div>

      <div className="grid gap-4 px-5 py-5">
        <div>
          <p className="text-base leading-snug">
            <span className="font-bold text-foreground">{displayName}</span>
            <span className="font-semibold text-foreground-secondary"> bet on:</span>
          </p>
          <p className="mt-2 text-lg font-bold leading-snug text-foreground">
            {question ? truncate(question, 140) : "Prediction on Mashi"}
          </p>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-foreground-secondary">
            <span>${totalVolume.toFixed(2)} volume</span>
            <span className="text-foreground-tertiary">·</span>
            <span>
              {closeLabel} {closeDate}
            </span>
          </p>
        </div>

        {isResolved && typeof pnl === "number" && typeof payout === "number" ? (
          <div className="rounded-2xl border border-border bg-white px-5 py-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-foreground-tertiary">
              Net result
            </p>
            <p className={`mt-3 text-[2.75rem] font-black tabular-nums leading-none tracking-tight sm:text-[3rem] ${pnlColorClass}`}>
              {pnlLine}
            </p>
            <p className="mt-4 text-lg font-semibold tabular-nums text-foreground">
              Total payout ${payout.toFixed(2)}
            </p>
          </div>
        ) : null}

        {hedged ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex min-h-[5rem] items-center justify-center rounded-xl bg-yes-bg p-4">
                <p className="text-center text-xl font-bold text-yes">
                  YES · ${props.yesStakeTotal.toFixed(2)}
                </p>
              </div>
              <div className="flex min-h-[5rem] items-center justify-center rounded-xl bg-no-bg p-4">
                <p className="text-center text-xl font-bold text-no">
                  NO · ${props.noStakeTotal.toFixed(2)}
                </p>
              </div>
            </div>
            {oddsPanel}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`flex min-h-[5.5rem] items-center justify-center rounded-xl p-4 ${props.side === "yes" ? "bg-yes-bg" : "bg-no-bg"}`}
            >
              <p className={`text-center text-xl font-bold ${props.side === "yes" ? "text-yes" : "text-no"}`}>
                {props.side.toUpperCase()} · ${props.amount.toFixed(2)}
              </p>
            </div>
            {oddsPanel}
          </div>
        )}
      </div>
    </div>
  );
}
