import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlatformAnalyticsTimeSeriesChart } from "@/components/platform-analytics-time-series-chart";
import { PLATFORM_ANALYTICS_RANGE_DAYS, parsePlatformAnalyticsRangeDays } from "@/lib/platform-analytics";
import { getPlatformAnalyticsData, getPlatformAnalyticsTimeSeries } from "@/lib/queries";
import { requireAuthUser } from "@/lib/session";
import { isSuperAdminUserId } from "@/lib/super-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mashi - Platform Analytics",
};

export default async function PlatformAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireAuthUser();
  if (!isSuperAdminUserId(user._id.toString())) {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const rangeDays = parsePlatformAnalyticsRangeDays(query.range);

  const [platformAnalytics, timeSeries] = await Promise.all([
    getPlatformAnalyticsData(),
    getPlatformAnalyticsTimeSeries(rangeDays),
  ]);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-white p-6 shadow-[var(--card-shadow)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Platform analytics</h1>
            <p className="mt-1 text-sm text-foreground-secondary">Global usage snapshot across all users and groups.</p>
          </div>
          <Link href="/dashboard" className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:border-brand hover:text-brand-dark">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl bg-background-secondary p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Users</p>
            <p className="mt-1 text-2xl font-bold">{platformAnalytics.totals.users}</p>
          </div>
          <div className="rounded-xl bg-background-secondary p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Groups</p>
            <p className="mt-1 text-2xl font-bold">{platformAnalytics.totals.groups}</p>
          </div>
          <div className="rounded-xl bg-background-secondary p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Markets</p>
            <p className="mt-1 text-2xl font-bold">{platformAnalytics.totals.markets}</p>
          </div>
          <div className="rounded-xl bg-background-secondary p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Users w/ 1+ bet</p>
            <p className="mt-1 text-2xl font-bold">{platformAnalytics.engagement.usersWithBets}</p>
          </div>
          <div className="rounded-xl bg-background-secondary p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">% users w/ bet</p>
            <p className="mt-1 text-2xl font-bold">{platformAnalytics.engagement.percentUsersWithBet.toFixed(1)}%</p>
          </div>
        </div>

        <section className="mt-8 rounded-xl border border-border bg-background-secondary/60 p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-tertiary">Activity over time</h2>
              <p className="mt-1 text-xs text-foreground-secondary">
                Daily counts by UTC calendar day ({timeSeries.startDate} → {timeSeries.endDate}). Same metrics as above, grouped by{" "}
                <code className="rounded bg-background-secondary px-1 py-0.5 text-[11px]">createdAt</code> on each record; joins use tracked{" "}
                <code className="rounded bg-background-secondary px-1 py-0.5 text-[11px]">member_joined</code> activity.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_ANALYTICS_RANGE_DAYS.map((d) => (
                <Link
                  key={d}
                  href={d === 90 ? "/platform-analytics" : `/platform-analytics?range=${d}`}
                  scroll={false}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    rangeDays === d
                      ? "border-brand bg-white text-brand-dark shadow-sm"
                      : "border-border bg-white text-foreground-secondary hover:border-brand hover:text-brand-dark"
                  }`}
                >
                  {d}d
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-white p-2 md:p-4">
            <PlatformAnalyticsTimeSeriesChart points={timeSeries.points} />
          </div>
        </section>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-tertiary">Markets per group</h2>
            <p className="mt-2 text-sm text-foreground-secondary">
              Average: <span className="font-semibold text-foreground-primary">{platformAnalytics.marketsPerGroup.average.toFixed(2)}</span>
            </p>
            <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1">
              {platformAnalytics.marketsPerGroup.byGroup.map((row) => (
                <div key={row.groupId} className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2 text-sm">
                  <span className="truncate pr-2">{row.groupName}</span>
                  <span className="font-semibold">{row.marketCount}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-tertiary">How users join</h2>
            <p className="mt-2 text-sm text-foreground-secondary">
              Based on <span className="font-semibold text-foreground-primary">{platformAnalytics.joins.totalTrackedJoins}</span> tracked joins.
            </p>
            <div className="mt-3 grid gap-2">
              {platformAnalytics.joins.breakdown.length === 0 ? (
                <p className="text-sm text-foreground-tertiary">No join activity tracked yet.</p>
              ) : (
                platformAnalytics.joins.breakdown.map((row) => (
                  <div key={row.source} className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2 text-sm">
                    <span className="truncate pr-2">{row.source}</span>
                    <span className="font-semibold">{row.count} ({row.percent.toFixed(1)}%)</span>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
