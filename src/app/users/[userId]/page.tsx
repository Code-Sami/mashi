import { LocalDate } from "@/components/local-date";
import { getPublicUserProfileData } from "@/lib/queries";
import { getInitials } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type UserProfilePageProps = {
  params: Promise<{ userId: string }>;
};

function activityLabel(item: { type: string; metadata: Record<string, unknown>; marketQuestion: string | null }) {
  if (item.type === "bet_placed") {
    const side = item.metadata?.side ? String(item.metadata.side).toUpperCase() : "N/A";
    const amount = item.metadata?.amount ? `$${Number(item.metadata.amount).toFixed(2)}` : "$0.00";
    return `Bet ${side} ${amount}`;
  }
  if (item.type === "market_created") return "Created market";
  if (item.type === "market_resolved") return "Resolved market";
  if (item.type === "member_joined") return "Joined group";
  return item.type.replaceAll("_", " ");
}

export default async function PublicUserProfilePage({ params }: UserProfilePageProps) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  const isOwnProfile = session?.user?.id === userId;
  const data = await getPublicUserProfileData(userId);
  if (!data) notFound();

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-white p-6 shadow-[var(--card-shadow)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-lg font-bold text-brand-dark">
            {getInitials(data.user.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{data.user.name}</h1>
              {data.user.isBot ? (
                <span className="inline-flex items-center rounded-full bg-violet-100 p-1.5 text-violet-600" title="Bot">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <rect x="3" y="8" width="18" height="12" rx="2" />
                    <path strokeLinecap="round" d="M12 8V5m-4 7h.01M16 12h.01M9 16h6" />
                    <circle cx="12" cy="5" r="1" fill="currentColor" />
                  </svg>
                </span>
              ) : null}
            </div>
            <p className="text-sm text-foreground-tertiary">
              {data.user.isBot
                ? data.user.botModel
                  ? `Powered by ${data.user.botModel}`
                  : "AI Bot"
                : data.user.joinedAt ? <>Joined <LocalDate iso={data.user.joinedAt} style="date" /></> : "Joined recently"}
            </p>
          </div>
          </div>
          {isOwnProfile ? (
            <Link
              href="/profile"
              className="shrink-0 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground-secondary transition hover:border-brand hover:text-brand-dark"
            >
              Settings
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Bets</p>
          <p className="mt-2 text-3xl font-bold">{data.stats.betsPlaced}</p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Markets created</p>
          <p className="mt-2 text-3xl font-bold">{data.stats.marketsCreated}</p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Net P/L</p>
          <p className={`mt-2 text-3xl font-bold ${data.stats.net >= 0 ? "text-increase" : "text-decrease"}`}>
            {data.stats.net >= 0 ? "+" : ""}${data.stats.net.toFixed(2)}
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
          <h2 className="font-semibold">Groups</h2>
          <div className="mt-3 grid max-h-[22rem] gap-2 overflow-y-auto pr-1">
            {data.groups.length === 0 ? (
              <p className="text-sm text-foreground-tertiary">No groups yet.</p>
            ) : (
              data.groups.map((group) => (
                <Link key={group.id} href={`/groups/${group.id}`} className="rounded-xl border border-border p-3 transition hover:border-brand hover:shadow-sm">
                  <p className="font-medium">{group.name}</p>
                  <p className="text-xs text-foreground-tertiary">
                    {group.role} · joined {group.joinedAt ? <LocalDate iso={group.joinedAt} style="date" /> : "recently"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
          <h2 className="font-semibold">Resolved bets</h2>
          <div className="mt-3 grid max-h-[22rem] gap-2 overflow-y-auto pr-1">
            {data.resolvedBets.length === 0 ? (
              <p className="text-sm text-foreground-tertiary">No resolved bets yet.</p>
            ) : (
              data.resolvedBets.map((bet) => (
                <Link key={bet.id} href={`/markets/${bet.marketId}`} className="rounded-xl border border-border p-3 transition hover:border-brand hover:shadow-sm">
                  <p className="font-medium">{bet.marketQuestion}</p>
                  <p className="mt-1 text-sm text-foreground-secondary">
                    <span className={bet.side === "yes" ? "text-yes" : "text-no"}>{bet.side.toUpperCase()}</span> · Stake ${bet.amount.toFixed(2)} · Outcome {bet.outcome.toUpperCase()}
                  </p>
                  <p className={`text-sm font-semibold ${bet.result === "win" ? "text-increase" : "text-decrease"}`}>
                    {bet.result === "win" ? "WIN" : "LOSS"} · Payout ${bet.payout.toFixed(2)} · P/L {bet.pnl >= 0 ? "+" : ""}${bet.pnl.toFixed(2)}
                  </p>
                  <p className="text-xs text-foreground-tertiary">{bet.createdAt ? <LocalDate iso={bet.createdAt} /> : ""}</p>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
          <h2 className="font-semibold">Market creations</h2>
          <div className="mt-3 grid max-h-[22rem] gap-2 overflow-y-auto pr-1">
            {data.recentCreations.length === 0 ? (
              <p className="text-sm text-foreground-tertiary">No markets created yet.</p>
            ) : (
              data.recentCreations.map((market) => (
                <Link key={market.id} href={`/markets/${market.id}`} className="rounded-xl border border-border p-3 transition hover:border-brand hover:shadow-sm">
                  <p className="font-medium">{market.question}</p>
                  <p className="text-sm text-foreground-secondary">
                    {market.groupName} · {market.status}
                    {market.outcome ? ` (${market.outcome.toUpperCase()})` : ""}
                  </p>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
          <h2 className="font-semibold">Activity</h2>
          <div className="mt-3 grid max-h-[22rem] gap-2 overflow-y-auto pr-1">
            {data.activity.length === 0 ? (
              <p className="text-sm text-foreground-tertiary">No recent activity.</p>
            ) : (
              data.activity.map((item) => (
                <div key={item.id} className="rounded-xl border border-border-light p-3">
                  <p className="text-sm font-medium">{activityLabel(item)}</p>
                  {item.marketId ? (
                    <Link href={`/markets/${item.marketId}`} className="text-sm text-brand-dark hover:underline">
                      {item.marketQuestion || "View market"}
                    </Link>
                  ) : (
                    <Link href={`/groups/${item.groupId}`} className="text-sm text-brand-dark hover:underline">
                      {item.groupName}
                    </Link>
                  )}
                  <p className="text-xs text-foreground-tertiary">{item.createdAt ? <LocalDate iso={item.createdAt} /> : ""}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
