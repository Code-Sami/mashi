"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { safeInternalPath } from "@/lib/safe-internal-path";

export default function LoginClient() {
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const returnTo = useMemo(() => {
    const raw = searchParams.get("callbackUrl");
    return safeInternalPath(raw) || "/dashboard";
  }, [searchParams]);
  const passwordResetOk = searchParams.get("reset") === "1";

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-8 shadow-[var(--card-shadow)]">
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="mt-1 text-sm text-foreground-secondary">Access your groups and markets.</p>
      {passwordResetOk ? (
        <p className="mt-4 rounded-xl bg-increase/10 p-3 text-sm text-increase">
          Your password was updated. Log in with your new password.
        </p>
      ) : null}
      <form
        className="mt-6 grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const form = new FormData(event.currentTarget);
          const result = await signIn("credentials", {
            email: form.get("email"),
            password: form.get("password"),
            callbackUrl: returnTo,
            redirect: false,
          });
          if (result?.error) {
            setError("Invalid email or password.");
            return;
          }
          window.location.href = returnTo;
        }}
      >
        <input name="email" type="email" required placeholder="Email" className="rounded-xl border border-border bg-background-secondary p-3 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        <input name="password" type="password" required placeholder="Password" className="rounded-xl border border-border bg-background-secondary p-3 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-brand-dark hover:underline">
            Forgot password?
          </Link>
        </div>
        <button className="rounded-xl bg-brand px-4 py-3 font-semibold text-brand-dark transition hover:bg-brand-hover">Log in</button>
      </form>
      {error ? <p className="mt-3 text-sm text-decrease">{error}</p> : null}
      <p className="mt-4 text-sm text-foreground-secondary">
        No account?{" "}
        <Link
          className="font-semibold text-brand-dark underline"
          href={returnTo !== "/dashboard" ? `/signup?callbackUrl=${encodeURIComponent(returnTo)}` : "/signup"}
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
