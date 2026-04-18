import { BetForm } from "@/components/bet-form";
import { BotText } from "@/components/bot-text";
import { DeleteMarketButton } from "@/components/delete-market-button";
import { DisputeControls } from "@/components/dispute-controls";
import { LocalDate } from "@/components/local-date";
import { MarketGearMenu } from "@/components/market-gear-menu";
import { ResolveControls } from "@/components/resolve-controls";
import { MarketQuestionWithMentions } from "@/components/market-question-with-mentions";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { SettlementCard, SettlementPopup } from "@/components/settlement-popup";
import { connectToDatabase } from "@/lib/mongodb";
import { getMarketDetailData } from "@/lib/queries";
import { GroupMemberModel } from "@/models/GroupMember";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type MarketPageProps = {
  params: Promise<{ marketId: string }>;
  searchParams: Promise<{ error?: string; resolved?: string }>;
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
  const isGroupOwner = data.groupOwnerId === user._id.toString();
  const hasBets = data.bets.length > 0;
  const isExcludedFromBetting = (data.market.excludedUserIds || []).includes(user._id.toString());
  const isPastDeadline = new Date(data.market.deadline).getTime() < Date.now();
  const userMap = new Map(data.users.map((u) => [u.id, u]));
  const isBotMarket = data.groupName === "LLM Arena";
  const canBet = data.market.status === "open" && isMember && !isExcludedFromBetting && !isPastDeadline && !isBotMarket;
  const errorMessage =
    query.error === "not_member"
      ? "Join this market's group before placing a bet."
      : query.error === "market_closed"
        ? "This market is closed for new bets."
        : query.error === "bot_market"
          ? "This is a bot-only market. Spectate and enjoy!"
          : query.error === "excluded_user"
            ? "You are excluded from betting in this market."
            : query.error === "invalid_bet"
              ? "Enter a valid side and amount to place a bet."
              : query.error === "max_bet"
                ? "Maximum bet amount is $100."
                : "";

  const isResolved = data.market.status === "resolved" && !!data.market.outcome;
  const showSettlementPopup = query.resolved === "true" && isResolved;
  const settlementEntries = isResolved
    ? data.bets.map((bet) => {
        const actor = userMap.get(bet.userId);
        const payout = (bet as typeof bet & { payout?: number }).payout ?? 0;
        return {
          userId: bet.userId,
          name: actor?.name || "Unknown user",
          side: bet.side as "yes" | "no",
          amount: bet.amount,
          payout,
          pnl: payout - bet.amount,
        };
      })
    : [];

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
          <div className="flex shrink-0 items-center gap-2">
            {isBotMarket ? (
              <span className="rounded-lg bg-violet-100 px-3 py-1 text-[0.9375rem] font-semibold text-violet-600">AI Arena</span>
            ) : null}
            <span className={`rounded-lg px-3 py-1 text-[0.9375rem] font-semibold ${
              data.market.status !== "open"
                ? "bg-foreground-tertiary/15 text-foreground-secondary"
                : isPastDeadline
                  ? "bg-amber-100 text-amber-700"
                  : "bg-increase/10 text-increase"
            }`}>
              {data.market.status !== "open" ? "Resolved" : isPastDeadline ? "Pending" : "Open"}
            </span>
            {isGroupOwner ? (
              <MarketGearMenu
                marketId={data.market.id}
                question={data.market.question}
                status={data.market.status as "open" | "resolved"}
                hasBets={hasBets}
              />
            ) : null}
          </div>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-secondary">
          {data.creator ? (
            <span>
              Creator:{" "}
              <Link href={`/users/${data.creator.id}`} className="font-medium text-brand-dark hover:underline">
                {data.creator.name}
              </Link>
            </span>
          ) : null}
          {data.umpire && !isBotMarket ? (
            <span>
              Umpire:{" "}
              <Link href={`/users/${data.umpire.id}`} className="font-medium text-brand-dark hover:underline">
                {data.umpire.name}
              </Link>
            </span>
          ) : null}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-secondary">
          <span>Deadline: <LocalDate iso={data.market.deadline} /></span>
          <span>${data.market.totalVolume.toFixed(2)} volume</span>
          {data.market.outcome ? (
            <span className="font-semibold">Outcome: <span className={data.market.outcome === "yes" ? "text-yes" : "text-no"}>{data.market.outcome.toUpperCase()}</span></span>
          ) : null}
        </div>

        {data.resolutionEvidence ? (
          <p className="mt-2 break-words rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700"><BotText text={data.resolutionEvidence} /></p>
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

        {isResolved ? (
          <SettlementCard
            outcome={data.market.outcome as "yes" | "no"}
            totalPool={data.market.totalVolume}
            entries={settlementEntries}
          />
        ) : isBotMarket ? (
          <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-[var(--card-shadow)] sm:p-6">
            <h2 className="font-semibold text-violet-700">Spectator mode</h2>
            <p className="mt-2 text-sm text-violet-600">This is a bot-only market. AI bots are betting against each other on real-world events. Watch the prices shift and see who wins!</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.bets.length > 0 ? (
                <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">{data.bets.length} bets placed</span>
              ) : (
                <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">Waiting for bots...</span>
              )}
              <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">${data.market.totalVolume.toFixed(2)} volume</span>
            </div>
          </article>
        ) : (
          <article className="rounded-2xl border border-border bg-white p-4 shadow-[var(--card-shadow)] sm:p-6">
            <h2 className="font-semibold">Place bet</h2>
            <BetForm
              marketId={data.market.id}
              yesShares={data.market.yesShares}
              noShares={data.market.noShares}
              canBet={canBet}
              errorMessage={errorMessage}
              isMember={isMember}
              isExcluded={isExcludedFromBetting}
              isPastDeadline={isPastDeadline}
            />
          </article>
        )}

        {canResolve && data.market.status === "open" && !isBotMarket ? (
          <article className="rounded-2xl border border-border bg-white p-4 shadow-[var(--card-shadow)] sm:p-6 md:col-span-2">
            <ResolveControls marketId={data.market.id} />
          </article>
        ) : null}

        {isBotMarket && isGroupOwner && isResolved && !data.acceptedAt ? (
          <article className="rounded-2xl border border-border bg-white p-4 shadow-[var(--card-shadow)] sm:p-6 md:col-span-2">
            <DisputeControls
              marketId={data.market.id}
              outcome={data.market.outcome as string}
              evidence={data.resolutionEvidence || ""}
            />
          </article>
        ) : null}

        {isGroupOwner && !hasBets ? (
          <article className="rounded-2xl border border-border bg-white p-4 shadow-[var(--card-shadow)] sm:p-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground-secondary">Delete market</h2>
                <p className="mt-0.5 text-sm text-foreground-tertiary">This market has no bets and can be permanently deleted.</p>
              </div>
              <DeleteMarketButton marketId={data.market.id} question={data.market.question} />
            </div>
          </article>
        ) : null}
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
                      </Link>
                      {actor?.isBot ? (
                        <span className="ml-1 inline-flex items-center rounded-full bg-violet-100 p-0.5 text-violet-600" title="Bot">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><rect x="3" y="8" width="18" height="12" rx="2" /><path strokeLinecap="round" d="M12 8V5m-4 7h.01M16 12h.01M9 16h6" /><circle cx="12" cy="5" r="1" fill="currentColor" /></svg>
                        </span>
                      ) : null}{" "}
                      placed <span className={bet.side === "yes" ? "font-semibold text-yes" : "font-semibold text-no"}>{bet.side.toUpperCase()}</span> bet
                    </p>
                    <p className="text-foreground-secondary">
                      ${bet.amount.toFixed(2)} · Yes {(bet.yesPriceAfter * 100).toFixed(1)}% · No {(bet.noPriceAfter * 100).toFixed(1)}%
                    </p>
                    {bet.reasoning ? (
                      <p className="mt-1 break-words rounded-lg bg-violet-50 px-2 py-1 text-xs italic text-violet-700">&ldquo;<BotText text={bet.reasoning} />&rdquo;</p>
                    ) : null}
                    <p className="text-xs text-foreground-tertiary"><LocalDate iso={bet.createdAt || ""} /></p>
                  </div>
                );
              })
          )}
        </div>
      </section>

      {showSettlementPopup ? (
        <SettlementPopup
          question={data.market.question}
          outcome={data.market.outcome as "yes" | "no"}
          totalPool={data.market.totalVolume}
          entries={settlementEntries}
          marketId={data.market.id}
        />
      ) : null}
    </div>
  );
}
