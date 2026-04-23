"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { SignOutButton } from "./sign-out-button";

type MobileNavProps = {
  userId?: string;
  isLoggedIn: boolean;
  unreadNotifications?: number;
};

export function MobileNav({ userId, isLoggedIn, unreadNotifications = 0 }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open ? (
        <div className="fixed inset-0 top-[57px] z-50 bg-brand-dark/95 backdrop-blur-sm">
          <nav className="grid gap-1 p-4">
            {isLoggedIn ? (
              <>
                <NavLink href="/dashboard" label="Dashboard" />
                <NavLink href="/groups" label="Groups" />
                <NavLink
                  href="/notifications"
                  label={unreadNotifications > 0 ? `Notifications (${unreadNotifications > 99 ? "99+" : unreadNotifications})` : "Notifications"}
                />
                {userId ? <NavLink href={`/users/${userId}`} label="Profile" /> : null}
                <div className="mt-2 border-t border-white/10 pt-3">
                  <SignOutButton />
                </div>
              </>
            ) : (
              <>
                <NavLink href="/login" label="Log in" />
                <Link
                  href="/signup"
                  className="mt-2 block rounded-xl bg-brand px-4 py-3 text-center font-semibold text-brand-dark transition hover:bg-brand-hover"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      ) : null}
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-4 py-3 text-base font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      {label}
    </Link>
  );
}
