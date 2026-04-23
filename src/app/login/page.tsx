import { Suspense } from "react";
import LoginClient from "./ui";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-8 text-center text-sm text-foreground-secondary shadow-[var(--card-shadow)]">Loading…</div>}>
      <LoginClient />
    </Suspense>
  );
}
