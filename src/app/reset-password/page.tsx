import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const query = await searchParams;
  const token = query.token?.trim() || "";

  if (!token) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-8 shadow-[var(--card-shadow)]">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="mt-2 text-sm text-foreground-secondary">
          This reset link is missing or invalid. Open the link from your email, or request a new reset.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/forgot-password" className="font-semibold text-brand-dark underline">
            Forgot password
          </Link>
          {" · "}
          <Link href="/login" className="font-semibold text-brand-dark underline">
            Log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-8 shadow-[var(--card-shadow)]">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <ResetPasswordForm token={token} />
    </div>
  );
}
