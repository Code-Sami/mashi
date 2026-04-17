import Link from "next/link";
import { BotText } from "@/components/bot-text";
import { GroupHeader } from "@/components/group-header";
import { MarketQuestionWithMentions } from "@/components/market-question-with-mentions";
import { getGroupPageData } from "@/lib/queries";
import { getInitials } from "@/lib/utils";
import { notFound } from "next/navigation";
import { requireAuthUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ error?: string; info?: string; moderation?: string; reason?: string; logId?: string; canOverride?: string }>;
};

export default async function GroupDetailPage({ params, searchParams }: PageProps) {
  const user = await requireAuthUser();
  const { groupId } = await params;
  const query = await searchParams;
  const data = await getGroupPageData(groupId, user._id.toString());
  if (!data) notFound();
  const memberNameById = new Map(data.members.map((member) => [member.userId, member.name]));
  const isOwner = data.group.ownerId === user._id.toString();
  const canView = data.group.isMember || data.group.visibility === "public";

  const infoMessage =
    query.info === "request_sent" ? "Your request to join has been sent." :
    query.info === "already_requested" ? "You already have a pending request." :
    query.error === "private_group" ? "This group is private. Request to join instead." : "";

  const moderation = query.moderation === "rejected"
    ? {
        rejected: true,
        reason: query.reason || "This question was flagged by moderation.",
        logId: query.logId || null,
        canOverride: query.canOverride === "1",
      }
    : undefined;

  const isBotArena = data.group.name === "Bot Arena";

  return (
    <div className="grid gap-6">
      <GroupHeader
        group={data.group}
        isOwner={isOwner}
        myPendingRequest={data.myPendingRequest}
        members={data.members.map((m) => ({
          userId: m.userId,
          name: m.name,
          role: m.role,
          initials: getInitials(m.name),
          isBot: m.isBot,
        }))}
        pendingRequests={data.pendingRequests.map((req) => ({
          ...req,
          initials: getInitials(req.name),
        }))}
        infoMessage={infoMessage}
        createMarketMembers={data.members.map((m) => ({
          userId: m.userId,
          name: m.name,
        }))}
        moderation={moderation}
        moderationLogs={data.moderationLogs}
        isBotArena={data.group.name === "Bot Arena"}
      />

      {canView ? (
        <>
          {/* Row 1: Leaderboard + Active Markets */}
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
              <h2 className="font-semibold">Leaderboard</h2>
              <div className="mt-3 grid max-h-[26rem] gap-2 overflow-y-auto pr-1 text-sm">
                {(() => {
                  const rows = isBotArena ? data.leaderboard.filter((r) => r.isBot) : data.leaderboard;
                  return rows.length === 0 ? (
                    <p className="text-sm text-foreground-tertiary">No bets placed yet.</p>
                  ) : rows.map((row, index) => (
                    <div key={row.userId} className="flex items-center justify-between rounded-xl border border-border-light p-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand-dark">
                          {index + 1}
                        </span>
                        <Link href={`/users/${row.userId}`} className="font-medium text-brand-dark hover:underline">
                          {row.name}
                        </Link>
                        {row.isBot ? (
                          <span className="inline-flex items-center rounded-full bg-violet-100 p-1 text-violet-600" title="Bot">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><rect x="3" y="8" width="18" height="12" rx="2" /><path strokeLinecap="round" d="M12 8V5m-4 7h.01M16 12h.01M9 16h6" /><circle cx="12" cy="5" r="1" fill="currentColor" /></svg>
                          </span>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${row.netPnL >= 0 ? "text-increase" : "text-decrease"}`}>{row.netPnL >= 0 ? "+" : ""}${row.netPnL.toFixed(2)}</p>
                        <p className="text-xs text-foreground-tertiary">{row.betsPlaced} bets</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
              <h2 className="font-semibold">Active markets</h2>
              <div className="mt-3 grid gap-2">
                {data.activeMarkets.length === 0 ? (
                  <p className="text-sm text-foreground-tertiary">No active markets yet.</p>
                ) : null}
                {data.activeMarkets.map((market) => (
                  <Link key={market.id} href={`/markets/${market.id}`} className="rounded-xl border border-border p-3 transition hover:border-brand hover:shadow-sm">
                    <p className="font-medium">
                      <MarketQuestionWithMentions
                        question={market.question}
                        taggedUsers={(market.taggedUserIds || []).map((id) => ({
                          id,
                          name: memberNameById.get(id) || "Unknown user",
                        }))}
                        linkify={false}
                      />
                    </p>
                    <div className="mt-1.5 flex gap-3 text-sm">
                      <span className="font-medium text-yes">{Math.round(market.yesPrice * 100)}% Yes</span>
                      <span className="font-medium text-no">{Math.round(market.noPrice * 100)}% No</span>
                      <span className="text-foreground-tertiary">${market.totalVolume.toFixed(2)} vol</span>
                    </div>
                  </Link>
                ))}
              </div>
            </article>
          </section>

          {/* Row 2: Resolved Markets + Activity Feed */}
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
              <h2 className="font-semibold">Resolved markets</h2>
              <div className="mt-3 grid gap-2">
                {data.resolvedMarkets.length === 0 ? (
                  <p className="text-sm text-foreground-tertiary">No resolved markets yet.</p>
                ) : null}
                {data.resolvedMarkets.map((market) => (
                  <Link key={market.id} href={`/markets/${market.id}`} className="rounded-xl border border-border p-3 transition hover:border-brand hover:shadow-sm">
                    <p className="font-medium">
                      <MarketQuestionWithMentions
                        question={market.question}
                        taggedUsers={(market.taggedUserIds || []).map((id) => ({
                          id,
                          name: memberNameById.get(id) || "Unknown user",
                        }))}
                        linkify={false}
                      />
                    </p>
                    <p className="mt-1 text-sm text-foreground-secondary">Outcome: <span className={`font-semibold ${market.outcome === "yes" ? "text-yes" : market.outcome === "no" ? "text-no" : ""}`}>{market.outcome?.toUpperCase() || "N/A"}</span></p>
                  </Link>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
              <h2 className="font-semibold">Activity feed</h2>
              <div className="mt-3 grid max-h-[26rem] gap-2 overflow-y-auto pr-1 text-sm">
                {data.activity.length === 0 ? (
                  <p className="text-sm text-foreground-tertiary">No activity yet.</p>
                ) : null}
                {data.activity.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border-light p-3">
                    <p className="font-medium">
                      <Link href={`/users/${item.actorUserId}`} className="text-brand-dark hover:underline">
                        {item.actorName}
                      </Link>
                      {item.actorIsBot ? (
                        <span className="ml-1 inline-flex items-center rounded-full bg-violet-100 p-0.5 text-violet-600" title="Bot">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><rect x="3" y="8" width="18" height="12" rx="2" /><path strokeLinecap="round" d="M12 8V5m-4 7h.01M16 12h.01M9 16h6" /><circle cx="12" cy="5" r="1" fill="currentColor" /></svg>
                        </span>
                      ) : null}{" "}
                      <span className="text-foreground-tertiary">·</span>{" "}
                      {item.type === "market_resolved" ? (
                        <>
                          resolved{" "}
                          {item.marketId ? (
                            <Link href={`/markets/${item.marketId}`} className="text-brand-dark hover:underline">{item.marketTitle}</Link>
                          ) : "a market"}
                        </>
                      ) : item.type === "bet_placed" ? (
                        <>
                          bet on{" "}
                          {item.marketId ? (
                            <Link href={`/markets/${item.marketId}`} className="text-brand-dark hover:underline">{item.marketTitle}</Link>
                          ) : "a market"}
                        </>
                      ) : item.type === "market_created" ? (
                        <>
                          created{" "}
                          {item.marketId ? (
                            <Link href={`/markets/${item.marketId}`} className="text-brand-dark hover:underline">{item.marketTitle}</Link>
                          ) : "a market"}
                        </>
                      ) : (
                        item.type.replaceAll("_", " ")
                      )}
                    </p>
                    {item.type === "bet_placed" ? (
                      <p className="mt-1 text-xs text-foreground-tertiary">
                        {item.metadata?.side ? `Side: ${String(item.metadata.side).toUpperCase()}` : "Bet placed"}
                        {item.metadata?.amount ? ` · Amount: $${Number(item.metadata.amount).toFixed(2)}` : ""}
                      </p>
                    ) : null}
                    {item.metadata?.reasoning ? (
                      <p className="mt-1 break-words rounded-lg bg-violet-50 px-2 py-1 text-xs italic text-violet-700">&ldquo;<BotText text={String(item.metadata.reasoning)} />&rdquo;</p>
                    ) : null}
                    {item.type === "market_resolved" && item.metadata?.evidence ? (
                      <p className="mt-1 break-words rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-700"><BotText text={String(item.metadata.evidence)} /></p>
                    ) : null}
                    <p className="text-xs text-foreground-tertiary">{new Date(item.createdAt || "").toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-border bg-white p-8 text-center shadow-[var(--card-shadow)]">
          <svg className="mx-auto h-12 w-12 text-foreground-tertiary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="mt-4 text-lg font-semibold">This group is private</p>
          <p className="mt-1 text-sm text-foreground-tertiary">You need to be a member to see markets, activity, and leaderboards.</p>
        </section>
      )}
    </div>
  );
}
