"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="ml-2 rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
    >
      Log out
    </button>
  );
}
