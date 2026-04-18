"use client";

import { placeBetAction } from "@/app/actions";
import { useState, useRef, useTransition } from "react";

type BetFormProps = {
  marketId: string;
  yesShares: number;
  noShares: number;
  canBet: boolean;
  errorMessage: string;
  isMember: boolean;
  isExcluded: boolean;
  isPastDeadline: boolean;
};

type BetPreview = {
  side: "yes" | "no";
  amount: number;
  payout: number;
  profit: number;
  returnMultiple: number;
  poolShare: number;
  otherSideEmpty: boolean;
};

function getBetPreview(
  amount: number,
  side: "yes" | "no",
  yesShares: number,
  noShares: number,
): BetPreview {
  const newYes = side === "yes" ? yesShares + amount : yesShares;
  const newNo = side === "no" ? noShares + amount : noShares;
  const newTotal = newYes + newNo;
  const winningPool = side === "yes" ? newYes : newNo;
  const losingPool = side === "yes" ? newNo : newYes;
  const poolShare = amount / winningPool;
  const payout = poolShare * newTotal;
  const profit = payout - amount;
  const returnMultiple = payout / amount;

  return {
    side,
    amount,
    payout,
    profit,
    returnMultiple,
    poolShare,
    otherSideEmpty: losingPool <= 0,
  };
}

export function BetForm({
  marketId,
  yesShares,
  noShares,
  canBet,
  errorMessage,
  isMember,
  isExcluded,
  isPastDeadline,
}: BetFormProps) {
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [side, setSide] = useState<"yes" | "no" | null>(null);
  const [amount, setAmount] = useState("");
  const [preview, setPreview] = useState<BetPreview | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handlePlaceBet(e: React.FormEvent) {
    e.preventDefault();
    if (!side) return;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || numAmount > 100) return;
    setPreview(getBetPreview(numAmount, side, yesShares, noShares));
    setStep("confirm");
  }

  function handleConfirm() {
    if (!side) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("marketId", marketId);
      formData.set("side", side);
      formData.set("amount", amount);
      await placeBetAction(formData);
      setStep("input");
      setPreview(null);
      setAmount("");
      setSide(null);
    });
  }

  function handleBack() {
    setStep("input");
    setPreview(null);
  }

  const sideLabel = side?.toUpperCase() ?? "";

  return (
    <>
      {errorMessage ? (
        <p className="mt-2 rounded-xl bg-decrease/10 p-3 text-sm text-decrease">{errorMessage}</p>
      ) : null}
      {!isMember ? (
        <p className="mt-2 rounded-xl bg-background-secondary p-3 text-sm text-foreground-secondary">
          You are viewing this market publicly. Join the group to place bets.
        </p>
      ) : null}
      {isExcluded ? (
        <p className="mt-2 rounded-xl bg-decrease/10 p-3 text-sm text-decrease">
          You are excluded from participating in this market.
        </p>
      ) : null}
      {isPastDeadline ? (
        <p className="mt-2 rounded-xl bg-foreground-tertiary/10 p-3 text-sm text-foreground-secondary">
          Betting is closed — the deadline has passed. Waiting for the umpire to resolve.
        </p>
      ) : null}

      {step === "input" ? (
        <form ref={formRef} onSubmit={handlePlaceBet} className="mt-3 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition ${side === "yes" ? "border-yes bg-yes-bg text-yes shadow-sm" : "border-yes/30 bg-yes-bg/50 text-yes/60"}`}>
              <input
                type="radio"
                name="side"
                value="yes"
                checked={side === "yes"}
                onChange={() => setSide("yes")}
                className="sr-only"
                disabled={!canBet}
              />
              Yes
            </label>
            <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition ${side === "no" ? "border-no bg-no-bg text-no shadow-sm" : "border-no/30 bg-no-bg/50 text-no/60"}`}>
              <input
                type="radio"
                name="side"
                value="no"
                checked={side === "no"}
                onChange={() => setSide("no")}
                className="sr-only"
                disabled={!canBet}
              />
              No
            </label>
          </div>
          <input
            name="amount"
            type="number"
            min="1"
            max="100"
            step="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (max $100)"
            className="rounded-xl border border-border bg-background-secondary p-2.5 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            disabled={!canBet}
          />
          <button
            disabled={!canBet || !side}
            className="rounded-xl bg-brand px-4 py-2.5 font-semibold text-brand-dark transition hover:bg-brand-hover disabled:bg-border disabled:text-foreground-tertiary"
          >
            Place bet
          </button>
        </form>
      ) : preview ? (
        <div className="mt-3 grid gap-3">
          <div className="rounded-xl border border-border-light bg-background-secondary p-4">
            <p className="text-sm font-semibold text-foreground-secondary">Confirm your bet</p>
            <p className="mt-1 text-lg font-bold">
              ${preview.amount.toFixed(2)} on{" "}
              <span className={side === "yes" ? "text-yes" : "text-no"}>{sideLabel}</span>
            </p>

            <div className="mt-3 space-y-2">
              <div className="rounded-lg bg-white p-3">
                <p className={`text-xs font-semibold uppercase tracking-wide ${side === "yes" ? "text-yes" : "text-no"}`}>
                  If {sideLabel} wins
                </p>
                {preview.otherSideEmpty ? (
                  <p className="mt-1 text-sm text-foreground-secondary">
                    No bets on the other side yet — your payout depends on others betting against you.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-xl font-bold">
                      ${preview.payout.toFixed(2)}{" "}
                      <span className="text-sm font-semibold text-increase">+${preview.profit.toFixed(2)}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-foreground-secondary">
                      {preview.returnMultiple.toFixed(2)}x return
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-lg bg-white p-3">
                <p className={`text-xs font-semibold uppercase tracking-wide ${side === "yes" ? "text-no" : "text-yes"}`}>
                  If {sideLabel} loses
                </p>
                <p className="mt-1 text-xl font-bold text-decrease">
                  -${preview.amount.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border-light pt-3">
              <p className="text-xs text-foreground-tertiary">
                Your pool share: {(preview.poolShare * 100).toFixed(1)}% of {sideLabel}
              </p>
            </div>
            <p className="mt-1 text-xs text-foreground-tertiary">
              Based on current bets. Final payout changes as others bet.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-border px-4 py-2.5 font-semibold text-foreground-secondary transition hover:bg-background-secondary"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="rounded-xl bg-brand px-4 py-2.5 font-semibold text-brand-dark transition hover:bg-brand-hover disabled:bg-border disabled:text-foreground-tertiary"
            >
              {isPending ? "Placing..." : "Confirm"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
