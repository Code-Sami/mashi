import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Analytics } from "@vercel/analytics/next";
import { authOptions } from "@/lib/auth";
import { MobileNav } from "@/components/mobile-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ensureExpiredUmpireNotificationsForUser, getUnreadNotificationCount } from "@/lib/notifications";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.mashimarkets.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mashi - Social Prediction Markets",
  description: "Social prediction markets for friend groups",
  openGraph: {
    type: "website",
    siteName: "Mashi",
    title: "Mashi - Social Prediction Markets",
    description: "Social prediction markets for friend groups",
    url: siteUrl,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = null;
  let unreadNotifications = 0;
  try {
    session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await ensureExpiredUmpireNotificationsForUser(session.user.id);
      unreadNotifications = await getUnreadNotificationCount(session.user.id);
    }
  } catch {
    session = null;
    unreadNotifications = 0;
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background-secondary text-foreground">
        <header className="border-b border-border bg-brand-dark">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm font-black text-brand-dark">M</span>
              Mashi
            </Link>
            <nav className="hidden items-center gap-1 text-sm md:flex">
              {session?.user ? (
                <>
                  <Link href="/dashboard" className="rounded-lg px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white">
                    Dashboard
                  </Link>
                  <Link href="/groups" className="rounded-lg px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white">
                    Groups
                  </Link>
                  <Link href="/notifications" className="rounded-lg px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white">
                    Notifications
                    {unreadNotifications > 0 ? (
                      <span className="ml-1 rounded-full bg-brand px-1.5 py-0.5 text-xs font-bold text-brand-dark">
                        {unreadNotifications > 99 ? "99+" : unreadNotifications}
                      </span>
                    ) : null}
                  </Link>
                  <Link href={`/users/${session.user.id}`} className="rounded-lg px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white">
                    Profile
                  </Link>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white">
                    Log in
                  </Link>
                  <Link href="/signup" className="ml-2 rounded-lg bg-brand px-4 py-2 font-medium text-brand-dark transition hover:bg-brand-hover">
                    Sign up
                  </Link>
                </>
              )}
            </nav>
            <MobileNav
              isLoggedIn={!!session?.user}
              userId={session?.user?.id}
              unreadNotifications={unreadNotifications}
            />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4 sm:py-8 md:px-8">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
