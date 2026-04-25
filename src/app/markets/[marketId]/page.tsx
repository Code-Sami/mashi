import { joinGroupAction } from "@/app/actions";
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
import { getPrices } from "@/lib/market";
import { getMarketDetailData } from "@/lib/queries";
import { GroupMemberModel } from "@/models/GroupMember";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthUserOrNull } from "@/lib/session";
import { isEffectiveGroupOwner } from "@/lib/super-admin";
import { GroupModel } from "@/models/Group";
import { MarketModel } from "@/models/Market";

export const dynamic = "force-dynamic";

type MarketPageProps = {
  params: Promise<{ marketId: string }>;
  searchParams: Promise<{ error?: string; resolved?: string }>;
};

export async function generateMetadata({ params }: MarketPageProps): Promise<Metadata> {
  const { marketId } = await params;
  await connectToDatabase();
  const market = await MarketModel.findById(
    marketId,
    { question: 1, yesShares: 1, noShares: 1, totalVolume: 1, status: 1, outcome: 1, groupId: 1 }
  ).lean();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.mashimarkets.com";
  const marketUrl = `${siteUrl}/markets/${marketId}`;
  if (!market) {
    return {
      title: "Market",
      openGraph: {
        title: "Market",
        url: marketUrl,
      },
    };
  }

  const group = await GroupModel.findById(market.groupId, { visibility: 1 }).lean();
  const isPrivate = (group as { visibility?: string } | null)?.visibility === "private";
  if (isPrivate) {
    const title = "Private market on Mashi";
    const description = "Join the group on Mashi to view this market.";
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: marketUrl,
        type: "website",
      },
    };
  }

  const prices = getPrices(market.yesShares || 0, market.noShares || 0);
  const yesPct = Math.round(prices.yesPrice * 100);
  const noPct = Math.round(prices.noPrice * 100);
  const outcomeText = market.status === "resolved" && market.outcome
    ? `Outcome: ${String(market.outcome).toUpperCase()}`
    : "Open for betting";
  const description = `${outcomeText} · Yes ${yesPct}% · No ${noPct}% · $${Number(market.totalVolume || 0).toFixed(2)} volume`;

  return {
    title: market.question || "Market",
    description,
    openGraph: {
      title: market.question || "Market",
      description,
      url: marketUrl,
      type: "article",
    },
  };
}

export default async function MarketPage({ params, searchParams }: MarketPageProps) {
  const user = await getAuthUserOrNull();
  const { marketId } = await params;
  const query = await searchParams;
  await connectToDatabase();

  const marketLean = await MarketModel.findById(marketId, { groupId: 1, question: 1 }).lean();
  if (!marketLean) {
    notFound();
  }
  const groupLean = await GroupModel.findById(marketLean.groupId, { name: 1, visibility: 1, ownerId: 1 }).lean();
  if (!groupLean) {
    notFound();
  }
  const groupVisibility = (groupLean as { visibility?: string }).visibility || "public";
  const requiresApproval = groupVisibility === "private";
  const isMember = user
    ? Boolean(
        await GroupMemberModel.exists({
          groupId: marketLean.groupId,
          userId: user._id,
        }),
      )
    : false;

  if (requiresApproval && !isMember) {
    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-border bg-white p-8 text-center shadow-[var(--card-shadow)]">
          <h1 className="text-xl font-bold">Members only market</h1>
          <p className="mt-1 text-sm text-foreground-secondary">
            Group: <span className="font-medium text-foreground">{groupLean.name}</span>
          </p>
          <p className="mt-2 text-sm text-foreground-secondary">
            This market belongs to {groupLean.name}. Request access to the group to view and participate.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {user ? (
              <>
                <Link
                  href={`/groups/${marketLean.groupId.toString()}`}
                  className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover"
                >
                  Request access
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/groups/${marketLean.groupId.toString()}`)}`}
                  className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover"
                >
                  Log in
                </Link>
                <Link
                  href={`/signup?callbackUrl=${encodeURIComponent(`/groups/${marketLean.groupId.toString()}`)}`}
                  className="inline-flex items-center rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground-secondary transition hover:bg-background-secondary"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    );
  }

  const data = await getMarketDetailData(marketId);
  if (!data) {
    notFound();
  }
  const canResolve = Boolean(user && data.market.umpireId === user._id.toString());
  const isGroupOwner = Boolean(
    user && data.groupOwnerId && isEffectiveGroupOwner(user._id.toString(), data.groupOwnerId)
  );
  const hasBets = data.bets.length > 0;
  const isExcludedFromBetting = Boolean(
    user && (data.market.excludedUserIds || []).includes(user._id.toString()),
  );
  const isPastDeadline = new Date(data.market.deadline).getTime() < Date.now();
  const userMap = new Map(data.users.map((u) => [u.id, u]));
  const isBotMarket = data.groupName === "LLM Arena";
  const canBet =
    Boolean(user) &&
    data.market.status === "open" &&
    isMember &&
    !isExcludedFromBetting &&
    !isPastDeadline &&
    !isBotMarket;
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
  const showSettlementPopup = Boolean(user && query.resolved === "true" && isResolved);
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
        ) : !user ? (
          <article className="rounded-2xl border border-border bg-white p-4 shadow-[var(--card-shadow)] sm:p-6">
            <h2 className="font-semibold">Place a bet</h2>
            <p className="mt-2 text-sm text-foreground-secondary">
              Log in or create an account, join this group, and you can bet on this market.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(`/markets/${data.market.id}`)}`}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover"
              >
                Log in to join and bet
              </Link>
              <Link
                href={`/signup?callbackUrl=${encodeURIComponent(`/markets/${data.market.id}`)}`}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground-secondary transition hover:bg-background-secondary"
              >
                Sign up
              </Link>
            </div>
          </article>
        ) : !isMember ? (
          <article className="rounded-2xl border border-border bg-white p-4 shadow-[var(--card-shadow)] sm:p-6">
            <h2 className="font-semibold">Join to bet</h2>
            <p className="mt-2 text-sm text-foreground-secondary">
              This is a public group market. Join the group to place bets.
            </p>
            <form action={joinGroupAction} className="mt-4">
              <input type="hidden" name="groupId" value={data.market.groupId} />
              <button className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover">
                Join group
              </button>
            </form>
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
