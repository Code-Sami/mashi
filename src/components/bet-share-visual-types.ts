/** Shared fields for share PNG / popup cards */
export type BetShareVisualCommonProps = {
  variant: "placed" | "won" | "lost" | "push";
  displayName: string;
  /** When null (private / locked), card shows generic copy */
  question: string | null;
  yesPriceAfter: number;
  noPriceAfter: number;
  totalVolume: number;
  /** Market deadline as ISO string — shown as date only (no time) */
  deadlineIso: string;
  /** When set, settlement cards show this date as resolution day instead of the deadline */
  resolvedAtIso?: string | null;
  /** Market resolution — drives the header pill (RESOLVED: YES / NO) on result cards */
  marketOutcome?: "yes" | "no";
  payout?: number;
  pnl?: number | null;
};

/** User bet only one side on this market */
export type BetShareVisualSingleProps = BetShareVisualCommonProps & {
  shareKind?: "single";
  side: "yes" | "no";
  amount: number;
};

/** User has stake on both YES and NO (hedge / arb exposure) */
export type BetShareVisualHedgedProps = BetShareVisualCommonProps & {
  shareKind: "hedged";
  yesStakeTotal: number;
  noStakeTotal: number;
};

export type BetShareVisualProps = BetShareVisualSingleProps | BetShareVisualHedgedProps;
