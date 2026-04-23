import Link from "next/link";
import type { Metadata } from "next";
import { MarketQuestionWithMentions } from "@/components/market-question-with-mentions";
import { getDashboardData } from "@/lib/queries";
import { ensureSeedData } from "@/lib/seed";
import { requireAuthUser } from "@/lib/session";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mashi - Dashboard",
};

export default async function DashboardPage() {
  const user = await requireAuthUser();
  await ensureSeedData();
  const data = await getDashboardData(user._id.toString());
  const explicitFullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const legacyName = (user.displayName || user.name || "").trim();
  const userFullName = explicitFullName
    ? explicitFullName
    : legacyName.split(/\s+/).length >= 2
      ? legacyName
      : `${legacyName || "User"} ${(user.email || "member").split("@")[0]}`;

  const pnlPositive = data.stats.netPnL >= 0;

  return (
    <div className="grid gap-6">
      {/* Welcome + Stats */}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-[var(--card-shadow)]">
        <h1 className="text-2xl font-bold">Welcome back, {userFullName}</h1>
        <p className="mt-1 text-sm text-foreground-secondary">Here&apos;s what&apos;s happening across your groups.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-background-secondary p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Bets placed</p>
            <p className="mt-1 text-2xl font-bold">{data.stats.totalBets}</p>
          </div>
          <div className="rounded-xl bg-background-secondary p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Active markets</p>
            <p className="mt-1 text-2xl font-bold">{data.stats.activeMarkets}</p>
          </div>
          <div className="rounded-xl bg-background-secondary p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Net P/L</p>
            <p className={`mt-1 text-2xl font-bold ${pnlPositive ? "text-increase" : "text-decrease"}`}>
              {pnlPositive ? "+" : ""}${data.stats.netPnL.toFixed(2)}
            </p>
          </div>
        </div>
      </section>

      {/* Expiring Soon + New Markets */}
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
          <h2 className="font-semibold">Expiring soon</h2>
          <div className="mt-3 grid max-h-[22rem] gap-2 overflow-y-auto pr-1">
            {data.expiringMarkets.length === 0 ? (
              <p className="text-sm text-foreground-tertiary">No markets expiring soon.</p>
            ) : (
              data.expiringMarkets.map((market) => (
                <Link key={market.id} href={`/markets/${market.id}`} className="rounded-xl border border-border p-3 transition hover:border-brand hover:shadow-sm">
                  <p className="font-medium">
                    <MarketQuestionWithMentions question={market.question} taggedUsers={market.taggedUsers} linkify={false} />
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-yes">{Math.round(market.yesPrice * 100)}% Yes</span>
                    <span className="font-medium text-no">{Math.round(market.noPrice * 100)}% No</span>
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                      {relativeTime(market.deadline)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground-tertiary">{market.groupName}</p>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
          <h2 className="font-semibold">New markets</h2>
          <div className="mt-3 grid max-h-[22rem] gap-2 overflow-y-auto pr-1">
            {data.newMarkets.length === 0 ? (
              <p className="text-sm text-foreground-tertiary">No new markets yet.</p>
            ) : (
              data.newMarkets.map((market) => (
                <Link key={market.id} href={`/markets/${market.id}`} className="rounded-xl border border-border p-3 transition hover:border-brand hover:shadow-sm">
                  <p className="font-medium">
                    <MarketQuestionWithMentions question={market.question} taggedUsers={market.taggedUsers} linkify={false} />
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-yes">{Math.round(market.yesPrice * 100)}% Yes</span>
                    <span className="font-medium text-no">{Math.round(market.noPrice * 100)}% No</span>
                    <span className="text-foreground-tertiary">${market.totalVolume.toFixed(2)} vol</span>
                  </div>
                  <p className="mt-1 text-xs text-foreground-tertiary">
                    {market.groupName} · {market.createdAt ? relativeTime(market.createdAt) : ""}
                  </p>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>

      {/* Friend Activity + Recent Wins/Losses */}
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
          <h2 className="font-semibold">Friend activity</h2>
          <div className="mt-3 grid max-h-[22rem] gap-2 overflow-y-auto pr-1">
            {data.friendActivity.length === 0 ? (
              <p className="text-sm text-foreground-tertiary">No recent activity.</p>
            ) : (
              data.friendActivity.map((item) => (
                <div key={item.id} className="rounded-xl border border-border-light p-3 text-sm">
                  <p className="font-medium">
                    <span className="text-brand-dark">{item.actorName}</span>
                    {" "}
                    {item.type === "bet_placed" ? (
                      <>
                        bet{" "}
                        <span className={item.metadata?.side === "yes" ? "font-semibold text-yes" : "font-semibold text-no"}>
                          {String(item.metadata?.side || "").toUpperCase()}
                        </span>
                        {item.metadata?.amount ? ` $${Number(item.metadata.amount).toFixed(0)}` : ""}
                        {" on "}
                        {item.marketId ? (
                          <Link href={`/markets/${item.marketId}`} className="text-brand-dark hover:underline">{item.marketTitle}</Link>
                        ) : "a market"}
                      </>
                    ) : item.type === "market_created" ? (
                      <>
                        {"created "}
                        {item.marketId ? (
                          <Link href={`/markets/${item.marketId}`} className="text-brand-dark hover:underline">{item.marketTitle}</Link>
                        ) : "a market"}
                      </>
                    ) : item.type === "market_resolved" ? (
                      <>
                        {"resolved "}
                        {item.marketId ? (
                          <Link href={`/markets/${item.marketId}`} className="text-brand-dark hover:underline">{item.marketTitle}</Link>
                        ) : "a market"}
                      </>
                    ) : item.type === "member_joined" ? (
                      <>joined <span className="text-foreground-secondary">{item.groupName}</span></>
                    ) : (
                      item.type.replaceAll("_", " ")
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-tertiary">
                    {item.groupName} · {item.createdAt ? relativeTime(item.createdAt) : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
          <h2 className="font-semibold">Recent wins &amp; losses</h2>
          <div className="mt-3 grid max-h-[22rem] gap-2 overflow-y-auto pr-1">
            {data.myResolvedBets.length === 0 ? (
              <p className="text-sm text-foreground-tertiary">No resolved bets yet. Place some bets!</p>
            ) : (
              data.myResolvedBets.map((bet) => (
                <Link key={bet.id} href={`/markets/${bet.marketId}`} className="rounded-xl border border-border p-3 transition hover:border-brand hover:shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{bet.marketQuestion}</p>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${bet.result === "win" ? "bg-increase/10 text-increase" : "bg-decrease/10 text-decrease"}`}>
                      {bet.result === "win" ? "WIN" : "LOSS"}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-2 text-sm">
                    <span className={bet.side === "yes" ? "font-medium text-yes" : "font-medium text-no"}>
                      {bet.side.toUpperCase()}
                    </span>
                    <span className="text-foreground-secondary">Stake ${bet.amount.toFixed(2)}</span>
                    <span className={`font-semibold ${bet.pnl >= 0 ? "text-increase" : "text-decrease"}`}>
                      {bet.pnl >= 0 ? "+" : ""}${bet.pnl.toFixed(2)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>

      {/* Your Groups */}
      <section className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Your groups</h2>
          <Link href="/groups" className="text-sm font-medium text-brand-dark hover:underline">View all</Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.groups.length === 0 ? (
            <p className="text-sm text-foreground-tertiary">
              No groups yet.{" "}
              <Link href="/groups" className="font-medium text-brand-dark hover:underline">Browse groups</Link>
            </p>
          ) : (
            data.groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-brand hover:shadow-sm">
                {group.name}
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
