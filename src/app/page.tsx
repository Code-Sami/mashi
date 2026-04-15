import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MOCK_MARKETS = [
  { q: "Will Jake actually run that 5K?", yes: 73, no: 27, vol: 245, hot: true },
  { q: "Does Sarah pass the bar exam?", yes: 88, no: 12, vol: 510, hot: false },
  { q: "Will Marcus cook dinner this Friday?", yes: 34, no: 66, vol: 120, hot: false },
];

const MOCK_ACTIVITY = [
  { user: "Maya", action: "bet YES on", market: "Will Jake run that 5K?", amount: 25, time: "2m ago" },
  { user: "Jordan", action: "bet NO on", market: "Marcus cooking Friday?", amount: 40, time: "8m ago" },
  { user: "Alex", action: "created", market: "Does Sarah pass the bar?", amount: null, time: "1h ago" },
  { user: "Sam", action: "resolved YES", market: "Will it rain Saturday?", amount: null, time: "3h ago" },
];

const MOCK_LEADERBOARD = [
  { name: "Maya L.", pnl: 142.5 },
  { name: "Jordan P.", pnl: 87.0 },
  { name: "Sam K.", pnl: -23.5 },
  { name: "Alex M.", pnl: -64.0 },
];

function MiniChart({ trend }: { trend: number[] }) {
  const h = 32;
  const w = 80;
  const max = Math.max(...trend);
  const min = Math.min(...trend);
  const range = max - min || 1;
  const pts = trend.map((v, i) => `${(i / (trend.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const final = trend[trend.length - 1];
  const first = trend[0];
  const color = final >= first ? "#0ac285" : "#d91616";
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="grid gap-16 py-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-dark px-5 py-10 text-white sm:px-8 sm:py-16 md:px-16 md:py-20">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-brand/5 blur-2xl" />
        <div className="relative z-10 max-w-2xl">
          <p className="inline-block rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand">
            Social prediction markets
          </p>
          <h1 className="mt-6 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Your group chat already makes predictions.
            <span className="text-brand"> Now make them count.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-white/60">
            &ldquo;I bet Jake won&rsquo;t finish that 5K.&rdquo; &ldquo;No way Sarah fails the bar.&rdquo;
            We make predictions every day &mdash; but nobody keeps score.
            Mashi turns your group&rsquo;s hot takes into real markets with real accountability.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={session ? "/dashboard" : "/signup"} className="rounded-xl bg-brand px-7 py-3.5 text-sm font-bold text-brand-dark transition hover:bg-brand-hover hover:shadow-lg hover:shadow-brand/25">
              {session ? "Go to dashboard" : "Start for free"}
            </Link>
            {!session ? (
              <Link href="/login" className="rounded-xl border border-white/20 px-7 py-3.5 text-sm font-medium text-white/80 transition hover:bg-white/10">
                Log in
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className="text-center">
        <h2 className="text-2xl font-bold md:text-3xl">Traditional prediction markets feel disconnected</h2>
        <p className="mx-auto mt-3 max-w-xl text-foreground-secondary">
          They&rsquo;re built for elections and stock prices. Not for whether your roommate will
          actually clean the kitchen. Mashi is built for the predictions you <em>already</em> make.
        </p>
      </section>

      {/* How it works */}
      <section className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
        <article className="group rounded-2xl border border-border bg-white p-7 shadow-[var(--card-shadow)] transition hover:border-brand/40 hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-xl transition group-hover:bg-brand/20">
            <svg className="h-6 w-6 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <h3 className="mt-5 text-lg font-bold">Create your group</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
            Gather your crew. Public groups are open to everyone; private ones require an invite. Your group, your rules.
          </p>
        </article>
        <article className="group rounded-2xl border border-border bg-white p-7 shadow-[var(--card-shadow)] transition hover:border-brand/40 hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yes/10 text-xl transition group-hover:bg-yes/20">
            <svg className="h-6 w-6 text-yes" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M2 12h5l3-9 4 18 3-9h5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h3 className="mt-5 text-lg font-bold">Post a prediction</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
            &ldquo;Will @Jake finish a 5K by June?&rdquo; Tag friends, set a deadline, pick an umpire. The market is live.
          </p>
        </article>
        <article className="group rounded-2xl border border-border bg-white p-7 shadow-[var(--card-shadow)] transition hover:border-brand/40 hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-no/10 text-xl transition group-hover:bg-no/20">
            <svg className="h-6 w-6 text-no" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
          </div>
          <h3 className="mt-5 text-lg font-bold">Settle the score</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
            The umpire resolves the market. Winners get paid out. The leaderboard updates. No more &ldquo;I told you so&rdquo; without proof.
          </p>
        </article>
      </section>

      {/* Live preview cards */}
      <section>
        <h2 className="mb-6 text-center text-2xl font-bold md:text-3xl">See it in action</h2>
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {/* Active markets card */}
          <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Active markets</h3>
            <div className="mt-3 grid gap-2">
              {MOCK_MARKETS.map((m) => (
                <div key={m.q} className="rounded-xl border border-border p-3 transition hover:border-brand/30">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{m.q}</p>
                    {m.hot ? <span className="shrink-0 rounded-md bg-increase/10 px-1.5 py-0.5 text-[10px] font-bold text-increase">HOT</span> : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-3 text-xs font-medium">
                      <span className="text-yes">{m.yes}% Yes</span>
                      <span className="text-no">{m.no}% No</span>
                    </div>
                    <MiniChart trend={m.yes > 50
                      ? [40, 45, 52, 60, 55, 65, 68, m.yes]
                      : [60, 55, 50, 45, 40, 38, 36, m.yes]
                    } />
                  </div>
                  <p className="mt-1 text-[11px] text-foreground-tertiary">${m.vol} volume</p>
                </div>
              ))}
            </div>
          </article>

          {/* Activity feed card */}
          <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Friend activity</h3>
            <div className="mt-3 grid gap-1.5">
              {MOCK_ACTIVITY.map((a, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-background-secondary">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand-dark">
                    {a.user[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{a.user}</span>{" "}
                      <span className="text-foreground-secondary">{a.action}</span>{" "}
                      <span className="font-medium">{a.market}</span>
                    </p>
                    <p className="text-[11px] text-foreground-tertiary">
                      {a.amount ? `$${a.amount} · ` : ""}{a.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Leaderboard card */}
          <article className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">Leaderboard</h3>
            <div className="mt-3 grid gap-2">
              {MOCK_LEADERBOARD.map((row, i) => (
                <div key={row.name} className="flex items-center justify-between rounded-xl border border-border-light p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand-dark">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{row.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${row.pnl >= 0 ? "text-increase" : "text-decrease"}`}>
                    {row.pnl >= 0 ? "+" : ""}${row.pnl.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-background-secondary p-4">
              <p className="text-center text-xs font-medium text-foreground-tertiary">Net P/L across all resolved markets</p>
              <div className="mt-2 flex justify-center">
                <svg width="200" height="48" className="overflow-visible">
                  <polyline fill="none" stroke="#0ac285" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="0,40 20,35 40,30 60,38 80,25 100,20 120,28 140,15 160,10 180,8 200,5" />
                  <polyline fill="none" stroke="#d91616" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" points="0,20 20,22 40,25 60,18 80,30 100,28 120,32 140,35 160,38 180,40 200,42" />
                </svg>
              </div>
              <div className="mt-2 flex justify-center gap-4 text-[10px] font-medium">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-increase" /> Winners</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-decrease" /> Losers</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Social proof / tagline */}
      <section className="rounded-3xl bg-brand-dark px-5 py-10 text-center text-white sm:px-8 sm:py-14 md:px-16">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
          Stop arguing. Start betting.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-white/50">
          Every group chat is full of predictions. Mashi gives you a scoreboard, a leaderboard,
          and the receipts to prove who really knows what they&rsquo;re talking about.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href={session ? "/dashboard" : "/signup"} className="rounded-xl bg-brand px-7 py-3.5 text-sm font-bold text-brand-dark transition hover:bg-brand-hover hover:shadow-lg hover:shadow-brand/25">
            {session ? "Go to dashboard" : "Create your first market"}
          </Link>
        </div>
      </section>
    </div>
  );
}
