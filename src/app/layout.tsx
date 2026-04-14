import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mashi",
  description: "Social prediction markets for friend groups",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
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
            <nav className="flex items-center gap-1 text-sm">
              {session?.user ? (
                <>
                  <Link href="/dashboard" className="rounded-lg px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white">
                    Dashboard
                  </Link>
                  <Link href="/groups" className="rounded-lg px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white">
                    Groups
                  </Link>
                  <Link href={`/users/${session.user.id}`} className="rounded-lg px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white">
                    Profile
                  </Link>
                  <Link href="/profile" className="rounded-lg px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white">
                    Settings
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
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">{children}</main>
      </body>
    </html>
  );
}
