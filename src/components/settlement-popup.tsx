"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type SettlementEntry = {
  userId: string;
  name: string;
  side: "yes" | "no";
  amount: number;
  payout: number;
  pnl: number;
};

type SettlementProps = {
  question: string;
  outcome: "yes" | "no";
  totalPool: number;
  entries: SettlementEntry[];
  marketId: string;
};

function aggregateEntries(entries: SettlementEntry[]) {
  const map = new Map<string, SettlementEntry>();
  for (const e of entries) {
    const key = `${e.userId}:${e.side}`;
    const existing = map.get(key);
    if (existing) {
      existing.amount += e.amount;
      existing.payout += e.payout;
      existing.pnl += e.pnl;
    } else {
      map.set(key, { ...e });
    }
  }
  return [...map.values()];
}

function SettlementBody({ entries }: { entries: SettlementEntry[] }) {
  const aggregated = aggregateEntries(entries);
  const winners = aggregated.filter((e) => e.pnl > 0).sort((a, b) => b.pnl - a.pnl);
  const breakEven = aggregated.filter((e) => e.pnl === 0);
  const losers = aggregated.filter((e) => e.pnl < 0).sort((a, b) => a.pnl - b.pnl);

  return (
    <>
      {winners.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-increase">Winners</p>
          <div className="mt-2 grid gap-1.5">
            {winners.map((entry) => (
              <div key={`${entry.userId}-${entry.side}`} className="flex items-center justify-between rounded-xl bg-increase/5 px-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/users/${entry.userId}`} className="text-sm font-semibold text-brand-dark hover:underline">
                    {entry.name}
                  </Link>
                  <p className="text-xs text-foreground-tertiary">
                    Bet ${entry.amount.toFixed(2)} {entry.side.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-increase">+${entry.pnl.toFixed(2)}</p>
                  <p className="text-xs text-foreground-tertiary">Payout ${entry.payout.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {breakEven.length > 0 ? (
        <div className={winners.length > 0 ? "mt-4" : ""}>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">Break even</p>
          <div className="mt-2 grid gap-1.5">
            {breakEven.map((entry) => (
              <div key={`${entry.userId}-${entry.side}`} className="flex items-center justify-between rounded-xl bg-foreground-tertiary/5 px-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/users/${entry.userId}`} className="text-sm font-semibold text-brand-dark hover:underline">
                    {entry.name}
                  </Link>
                  <p className="text-xs text-foreground-tertiary">
                    Bet ${entry.amount.toFixed(2)} {entry.side.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground-secondary">$0.00</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {losers.length > 0 ? (
        <div className={winners.length > 0 || breakEven.length > 0 ? "mt-4" : ""}>
          <p className="text-xs font-semibold uppercase tracking-wide text-decrease">Losers</p>
          <div className="mt-2 grid gap-1.5">
            {losers.map((entry) => (
              <div key={`${entry.userId}-${entry.side}`} className="flex items-center justify-between rounded-xl bg-decrease/5 px-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/users/${entry.userId}`} className="text-sm font-semibold text-brand-dark hover:underline">
                    {entry.name}
                  </Link>
                  <p className="text-xs text-foreground-tertiary">
                    Bet ${entry.amount.toFixed(2)} {entry.side.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-decrease">${entry.pnl.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function SettlementPopup({ question, outcome, totalPool, entries, marketId }: SettlementProps) {
  const router = useRouter();

  function close() {
    router.replace(`/markets/${marketId}`, { scroll: false });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={close}>
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`rounded-t-2xl px-5 py-4 ${outcome === "yes" ? "bg-yes" : "bg-no"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-xs font-black text-white">M</span>
              <span className="text-sm font-bold text-white/80">Mashi</span>
            </div>
            <span className="rounded-lg bg-white/20 px-3 py-1 text-sm font-bold text-white">
              {outcome.toUpperCase()} wins
            </span>
          </div>
          <p className="mt-3 text-base font-bold leading-snug text-white">{question}</p>
          <p className="mt-1 text-sm text-white/70">${totalPool.toFixed(2)} total pool</p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          <SettlementBody entries={entries} />
        </div>

        <div className="border-t border-border px-5 py-3">
          <button
            onClick={close}
            className="w-full rounded-xl bg-brand-dark py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark-light"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettlementCard({ outcome, totalPool, entries }: Omit<SettlementProps, "question" | "marketId">) {
  return (
    <article className="rounded-2xl border border-border bg-white shadow-[var(--card-shadow)]">
      <div className={`flex items-center justify-between rounded-t-2xl px-4 py-3 sm:px-6 ${outcome === "yes" ? "bg-yes" : "bg-no"}`}>
        <h2 className="font-semibold text-white">Settlement</h2>
        <span className="rounded-lg bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white">
          {outcome.toUpperCase()} wins · ${totalPool.toFixed(2)} pool
        </span>
      </div>
      <div className="max-h-[26rem] overflow-y-auto p-4 sm:p-6">
        {entries.length === 0 ? (
          <p className="text-sm text-foreground-tertiary">No bets were placed on this market.</p>
        ) : (
          <SettlementBody entries={entries} />
        )}
      </div>
    </article>
  );
}
