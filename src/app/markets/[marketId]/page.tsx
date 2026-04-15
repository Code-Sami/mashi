import { placeBetAction, resolveMarketAction } from "@/app/actions";
import { MarketQuestionWithMentions } from "@/components/market-question-with-mentions";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { connectToDatabase } from "@/lib/mongodb";
import { getMarketDetailData } from "@/lib/queries";
import { GroupMemberModel } from "@/models/GroupMember";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type MarketPageProps = {
  params: Promise<{ marketId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function MarketPage({ params, searchParams }: MarketPageProps) {
  const user = await requireAuthUser();
  const { marketId } = await params;
  const query = await searchParams;
  const data = await getMarketDetailData(marketId);
  if (!data) {
    notFound();
  }
  await connectToDatabase();
  const isMember = Boolean(
    await GroupMemberModel.exists({
      groupId: data.market.groupId,
      userId: user._id,
    })
  );
  const canResolve = data.market.umpireId === user._id.toString();
  const isExcludedFromBetting = (data.market.excludedUserIds || []).includes(user._id.toString());
  const canBet = data.market.status === "open" && isMember && !isExcludedFromBetting;
  const userMap = new Map(data.users.map((u) => [u.id, u]));
  const errorMessage =
    query.error === "not_member"
      ? "Join this market's group before placing a bet."
      : query.error === "market_closed"
        ? "This market is closed for new bets."
        : query.error === "excluded_user"
          ? "You are excluded from betting in this market."
        : query.error === "invalid_bet"
          ? "Enter a valid side and amount to place a bet."
          : query.error === "max_bet"
            ? "Maximum bet amount is $100."
            : "";

  return (
    <div className="grid gap-6">
      <div>
        <Link href={`/groups/${data.market.groupId}`} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:border-brand hover:text-brand-dark">
          <span className="text-foreground-tertiary">&larr;</span> Back to group
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-[var(--card-shadow)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold sm:text-2xl">
            <MarketQuestionWithMentions question={data.market.question} taggedUsers={data.taggedUsers} />
          </h1>
          <span className={`shrink-0 rounded-lg px-3 py-1 text-[0.9375rem] font-semibold ${data.market.status === "open" ? "bg-increase/10 text-increase" : "bg-foreground-tertiary/15 text-foreground-secondary"}`}>
            {data.market.status === "open" ? "Open" : "Resolved"}
          </span>
        </div>
        {data.umpire ? (
          <p className="mt-2 text-sm text-foreground-secondary">
            Umpire:{" "}
            <Link href={`/users/${data.umpire.id}`} className="font-medium text-brand-dark hover:underline">
              {data.umpire.name}
            </Link>
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-secondary">
          <span>Deadline: {new Date(data.market.deadline).toLocaleString()}</span>
          <span>${data.market.totalVolume.toFixed(2)} volume</span>
          {data.market.outcome ? (
            <span className="font-semibold">Outcome: <span className={data.market.outcome === "yes" ? "text-yes" : "text-no"}>{data.market.outcome.toUpperCase()}</span></span>
          ) : null}
        </div>
        {data.taggedUsers.length > 0 ? (
          <p className="mt-2 text-sm text-foreground-secondary">
            Tagged:{" "}
            {data.taggedUsers.map((tagged, index) => (
              <span key={tagged.id}>
                <Link href={`/users/${tagged.id}`} className="font-medium text-brand-dark hover:underline">
                  {tagged.name}
                </Link>
                {index < data.taggedUsers.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        ) : null}
        {data.excludedUsers.length > 0 ? (
          <p className="mt-1 text-sm text-foreground-secondary">
            Excluded from betting:{" "}
            {data.excludedUsers.map((excluded, index) => (
              <span key={excluded.id}>
                <Link href={`/users/${excluded.id}`} className="font-medium text-decrease hover:underline">
                  {excluded.name}
                </Link>
                {index < data.excludedUsers.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-white p-4 shadow-[var(--card-shadow)] sm:p-6">
          <h2 className="font-semibold">Current prices</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-yes-bg p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-yes">Yes</p>
              <p className="mt-1 text-3xl font-bold text-yes">{Math.round(data.market.yesPrice * 100)}<span className="text-lg">%</span></p>
            </div>
            <div className="rounded-xl bg-no-bg p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-no">No</p>
              <p className="mt-1 text-3xl font-bold text-no">{Math.round(data.market.noPrice * 100)}<span className="text-lg">%</span></p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-white p-4 shadow-[var(--card-shadow)] sm:p-6">
          <h2 className="font-semibold">Place bet</h2>
          {errorMessage ? <p className="mt-2 rounded-xl bg-decrease/10 p-3 text-sm text-decrease">{errorMessage}</p> : null}
          {!isMember ? (
            <p className="mt-2 rounded-xl bg-background-secondary p-3 text-sm text-foreground-secondary">
              You are viewing this market publicly. Join the group to place bets.
            </p>
          ) : null}
          {isExcludedFromBetting ? (
            <p className="mt-2 rounded-xl bg-decrease/10 p-3 text-sm text-decrease">
              You are excluded from participating in this market.
            </p>
          ) : null}
          <form action={placeBetAction} className="mt-3 grid gap-2">
            <input type="hidden" name="marketId" value={data.market.id} />
            <div className="grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-yes/30 bg-yes-bg p-3 text-sm font-semibold text-yes has-[:checked]:border-yes has-[:checked]:shadow-sm">
                <input type="radio" name="side" value="yes" defaultChecked className="sr-only" disabled={!canBet} />
                Yes
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-no/30 bg-no-bg p-3 text-sm font-semibold text-no has-[:checked]:border-no has-[:checked]:shadow-sm">
                <input type="radio" name="side" value="no" className="sr-only" disabled={!canBet} />
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
              placeholder="Amount (max $100)"
              className="rounded-xl border border-border bg-background-secondary p-2.5 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              disabled={!canBet}
            />
            <button disabled={!canBet} className="rounded-xl bg-brand px-4 py-2.5 font-semibold text-brand-dark transition hover:bg-brand-hover disabled:bg-border disabled:text-foreground-tertiary">
              Place bet
            </button>
          </form>
          {canResolve && data.market.status === "open" ? (
            <div className="mt-4 flex gap-2 border-t border-border-light pt-4">
              <form action={resolveMarketAction} className="flex-1">
                <input type="hidden" name="marketId" value={data.market.id} />
                <input type="hidden" name="outcome" value="yes" />
                <button className="w-full rounded-xl bg-yes px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90">Resolve YES</button>
              </form>
              <form action={resolveMarketAction} className="flex-1">
                <input type="hidden" name="marketId" value={data.market.id} />
                <input type="hidden" name="outcome" value="no" />
                <button className="w-full rounded-xl bg-no px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90">Resolve NO</button>
              </form>
            </div>
          ) : null}
        </article>
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-[var(--card-shadow)] sm:p-6">
        <h2 className="font-semibold">Price history</h2>
        <PriceHistoryChart points={data.priceHistory} />
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-[var(--card-shadow)] sm:p-6">
        <h2 className="font-semibold">Activity</h2>
        <div className="mt-3 grid max-h-[24rem] gap-2 overflow-y-auto pr-1">
          {data.bets.length === 0 ? (
            <p className="text-sm text-foreground-tertiary">No bets yet for this market.</p>
          ) : (
            data.bets
              .slice()
              .reverse()
              .map((bet) => {
                const actor = userMap.get(bet.userId);
                return (
                  <div key={bet.id} className="rounded-xl border border-border-light p-3 text-sm">
                    <p className="font-medium">
                      <Link href={`/users/${bet.userId}`} className="text-brand-dark hover:underline">
                        {actor?.name || "Unknown user"}
                      </Link>{" "}
                      placed <span className={bet.side === "yes" ? "font-semibold text-yes" : "font-semibold text-no"}>{bet.side.toUpperCase()}</span> bet
                    </p>
                    <p className="text-foreground-secondary">
                      ${bet.amount.toFixed(2)} · Yes {(bet.yesPriceAfter * 100).toFixed(1)}% · No {(bet.noPriceAfter * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-foreground-tertiary">{new Date(bet.createdAt || "").toLocaleString()}</p>
                  </div>
                );
              })
          )}
        </div>
      </section>
    </div>
  );
}
