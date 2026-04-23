"use client";

import { useState } from "react";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const email = (new FormData(form).get("email") as string)?.trim() ?? "";

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };

      if (res.status === 429) {
        setError(data.message || "Too many requests. Try again later.");
        setLoading(false);
        return;
      }
      if (!res.ok && data.error === "invalid_email") {
        setError("Enter a valid email address.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Try again.");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Try again.");
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="mt-4 space-y-3">
        <p className="rounded-xl bg-brand/10 p-3 text-sm text-brand-dark">
          If an account exists for that email, we sent reset instructions. Check your inbox (and spam).
        </p>
        <p className="text-sm text-foreground-secondary">
          <button
            type="button"
            className="font-semibold text-brand-dark underline"
            onClick={() => {
              setSent(false);
              setError("");
            }}
          >
            Send another email
          </button>
        </p>
      </div>
    );
  }

  return (
    <>
      {error ? <p className="mt-4 rounded-xl bg-decrease/10 p-3 text-sm text-decrease">{error}</p> : null}
      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          className="rounded-xl border border-border bg-background-secondary p-3 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand px-4 py-3 font-semibold text-brand-dark transition hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </>
  );
}

export function ForgotPasswordFooter() {
  return (
    <p className="mt-6 text-sm text-foreground-secondary">
      <Link href="/login" className="font-semibold text-brand-dark underline">
        Back to log in
      </Link>
    </p>
  );
}
