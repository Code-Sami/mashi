import Link from "next/link";
import type { Metadata } from "next";
import { BotText } from "@/components/bot-text";
import { GroupHeader } from "@/components/group-header";
import { LocalDate } from "@/components/local-date";
import { MarketGearMenu } from "@/components/market-gear-menu";
import { MarketQuestionWithMentions } from "@/components/market-question-with-mentions";
import { getGroupPageData } from "@/lib/queries";
import { isEffectiveGroupOwner } from "@/lib/super-admin";
import { appBaseUrl } from "@/lib/password-reset-email";
import { getJoinModeFromVisibility, getOrCreateActiveGroupInvite } from "@/lib/invites";
import { relativeTime } from "@/lib/utils";
import { notFound } from "next/navigation";
import { getAuthUserOrNull } from "@/lib/session";
import { connectToDatabase } from "@/lib/mongodb";
import { GroupModel } from "@/models/Group";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ error?: string; info?: string; joined?: string; moderation?: string; reason?: string; logId?: string; canOverride?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { groupId } = await params;
  await connectToDatabase();
  const group = await GroupModel.findById(groupId, { name: 1 }).lean();
  return {
    title: group?.name || "Group",
  };
}

export default async function GroupDetailPage({ params, searchParams }: PageProps) {
  const user = await getAuthUserOrNull();
  const { groupId } = await params;
  const query = await searchParams;
  const data = await getGroupPageData(groupId, user?._id.toString() || null);
  if (!data) notFound();
  const isOwner = Boolean(user && isEffectiveGroupOwner(user._id.toString(), data.group.ownerId));
  const canUseInviteLink =
    Boolean(user && data.group.isMember && (data.group.visibility === "public" || isOwner));
  const invite = canUseInviteLink
    ? await getOrCreateActiveGroupInvite(
        data.group.id,
        data.group.ownerId,
        getJoinModeFromVisibility(data.group.visibility),
      )
    : null;
  const inviteUrl = invite ? `${appBaseUrl()}/invite/${invite.code}` : `${appBaseUrl()}/groups/${data.group.id}`;
  const groupUrl = `${appBaseUrl()}/groups/${data.group.id}`;
  const memberNameById = new Map(data.members.map((member) => [member.userId, member.name]));
  const visibleMemberCount = (data.group as { memberCount?: number }).memberCount ?? data.members.length;
  const canView = data.group.canViewContent;

  const infoMessage =
    query.info === "request_sent" ? "Your request to join has been sent." :
    query.info === "already_requested" ? "You already have a pending request." :
    query.error === "private_group" ? "This group requires approval to join." :
    query.joined === "1" ? "Welcome to the group." : "";

  const moderation = query.moderation === "rejected"
    ? {
        rejected: true,
        reason: query.reason || "This question was flagged by moderation.",
        logId: query.logId || null,
        canOverride: query.canOverride === "1",
      }
    : undefined;

  const isLlmArena = data.group.name === "LLM Arena";

  return (
    <div className="grid gap-6">
      {user ? (
        <GroupHeader
          group={data.group}
          isOwner={isOwner}
          myPendingRequest={data.myPendingRequest}
          members={data.members.map((m) => ({
            userId: m.userId,
            name: m.name,
            role: m.role,
            avatarUrl: m.avatarUrl,
            isBot: m.isBot,
          }))}
          pendingRequests={data.pendingRequests.map((req) => ({
            ...req,
            avatarUrl: req.avatarUrl,
          }))}
          infoMessage={infoMessage}
          createMarketMembers={data.members.map((m) => ({
            userId: m.userId,
            name: m.name,
          }))}
          moderation={moderation}
          moderationLogs={data.moderationLogs}
          isLlmArena={data.group.name === "LLM Arena"}
          inviteUrl={inviteUrl}
          groupUrl={groupUrl}
        />
      ) : (
        <section className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
          <h1 className="text-2xl font-bold">{data.group.name}</h1>
          <p className="mt-1 text-sm text-foreground-secondary">
            {visibleMemberCount} {visibleMemberCount === 1 ? "member" : "members"}
          </p>
          <p className="mt-3 max-w-prose text-sm text-foreground-secondary">
            {data.group.visibility === "public"
              ? "This is a public group. Log in to join this group."
              : "Private group. Unlisted, owner approval required. Log in to request access."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.group.visibility === "public" ? (
              <>
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/groups/${data.group.id}`)}`}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover"
                >
                  Log in to join this group
                </Link>
                <Link
                  href={`/signup?callbackUrl=${encodeURIComponent(`/groups/${data.group.id}`)}`}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-background-secondary"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/groups/${data.group.id}`)}`}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover"
                >
                  Log in
                </Link>
                <Link
                  href={`/signup?callbackUrl=${encodeURIComponent(`/groups/${data.group.id}`)}`}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-background-secondary"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </section>
      )}

      {canView ? (
        <>
          {/* Row 1: Leaderboard + Active Markets */}
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
              <h2 className="font-semibold">Leaderboard</h2>
              <div className="mt-3 grid max-h-[26rem] gap-2 overflow-y-auto pr-1 text-sm">
                {(() => {
                  const rows = isLlmArena ? data.leaderboard.filter((r) => r.isBot) : data.leaderboard;
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
                          <span className="inline-flex items-center rounded-full bg-violet-100 p-1 text-violet-600" title={row.botModel || "Bot"}>
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
              <div className="mt-3 grid max-h-[26rem] gap-2 overflow-y-auto pr-1">
                {data.activeMarkets.length === 0 ? (
                  <p className="text-sm text-foreground-tertiary">No active markets yet.</p>
                ) : null}
                {data.activeMarkets.map((market) => (
                  <div key={market.id} className="relative rounded-xl border border-border p-3 transition hover:border-brand hover:shadow-sm">
                    <Link href={`/markets/${market.id}`} className="block">
                      <p className="font-medium pr-8">
                        <MarketQuestionWithMentions
                          question={market.question}
                          taggedUsers={(market.taggedUserIds || []).map((id) => ({
                            id,
                            name: memberNameById.get(id) || "Unknown user",
                          }))}
                          linkify={false}
                        />
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-yes">{Math.round(market.yesPrice * 100)}% Yes</span>
                        <span className="font-medium text-no">{Math.round(market.noPrice * 100)}% No</span>
                        <span className="text-foreground-tertiary">${market.totalVolume.toFixed(2)} vol</span>
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                          {relativeTime(market.deadline)}
                        </span>
                      </div>
                    </Link>
                    {isOwner ? (
                      <div className="absolute right-2 top-2">
                        <MarketGearMenu
                          marketId={market.id}
                          question={market.question}
                          status="open"
                          hasBets={market.betCount > 0}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          </section>

          {/* Row 2: Resolved Markets + Activity Feed */}
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
              <h2 className="font-semibold">Resolved markets</h2>
              <div className="mt-3 grid max-h-[26rem] gap-2 overflow-y-auto pr-1">
                {data.resolvedMarkets.length === 0 ? (
                  <p className="text-sm text-foreground-tertiary">No resolved markets yet.</p>
                ) : null}
                {data.resolvedMarkets.map((market) => (
                  <div key={market.id} className="relative rounded-xl border border-border p-3 transition hover:border-brand hover:shadow-sm">
                    <Link href={`/markets/${market.id}`} className="block">
                      <p className="font-medium pr-8">
                        <MarketQuestionWithMentions
                          question={market.question}
                          taggedUsers={(market.taggedUserIds || []).map((id) => ({
                            id,
                            name: memberNameById.get(id) || "Unknown user",
                          }))}
                          linkify={false}
                        />
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-foreground-secondary">
                        <span>Outcome: <span className={`font-semibold ${market.outcome === "yes" ? "text-yes" : market.outcome === "no" ? "text-no" : ""}`}>{market.outcome?.toUpperCase() || "N/A"}</span></span>
                        <span>${market.totalVolume.toFixed(2)} vol</span>
                        <span><LocalDate iso={market.deadline} /></span>
                      </div>
                    </Link>
                    {isOwner ? (
                      <div className="absolute right-2 top-2">
                        <MarketGearMenu
                          marketId={market.id}
                          question={market.question}
                          status="resolved"
                          hasBets={market.betCount > 0}
                        />
                      </div>
                    ) : null}
                  </div>
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
                    <p className="text-xs text-foreground-tertiary"><LocalDate iso={item.createdAt || ""} /></p>
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
          <p className="mt-4 text-lg font-semibold">You are not in this group yet</p>
          <p className="mt-1 text-sm text-foreground-tertiary">
            {user ? "Use the request button above to ask for access." : "Log in to request access."}
          </p>
        </section>
      )}
    </div>
  );
}
