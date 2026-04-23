import { ForgotPasswordFooter, ForgotPasswordForm } from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-8 shadow-[var(--card-shadow)]">
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <p className="mt-1 text-sm text-foreground-secondary">
        Enter your email and we&apos;ll send you a link to reset your password if an account exists.
      </p>

      <ForgotPasswordForm />

      <ForgotPasswordFooter />
    </div>
  );
}
