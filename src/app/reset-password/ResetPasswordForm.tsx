"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type Props = { token: string };

export function ResetPasswordForm({ token }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const newPassword = (fd.get("password") as string) || "";
    const confirm = (fd.get("confirmPassword") as string) || "";

    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };

      if (!res.ok || !data.ok) {
        setError(
          data.message ||
            (data.error === "weak_password"
              ? "Password does not meet requirements."
              : "This link is invalid, expired, or was already used. Request a new reset from forgot password.")
        );
        setLoading(false);
        return;
      }
      router.push("/login?reset=1");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    }
    setLoading(false);
  }

  return (
    <>
      {error ? <p className="mt-4 rounded-xl bg-decrease/10 p-3 text-sm text-decrease">{error}</p> : null}
      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <p className="text-sm text-foreground-secondary">Use at least 8 characters.</p>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="New password (min 8 chars)"
          className="rounded-xl border border-border bg-background-secondary p-3 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Confirm new password"
          className="rounded-xl border border-border bg-background-secondary p-3 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand px-4 py-3 font-semibold text-brand-dark transition hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
      <p className="mt-6 text-sm text-foreground-secondary">
        <Link href="/login" className="font-semibold text-brand-dark underline">
          Log in
        </Link>
      </p>
    </>
  );
}
