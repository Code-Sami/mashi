import Link from "next/link";
import { signupAction } from "@/app/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const errorMessage =
    query.error === "taken"
      ? "Email is already in use."
      : query.error === "invalid"
        ? "Please provide valid signup details."
        : "";

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-8 shadow-[var(--card-shadow)]">
      <h1 className="text-2xl font-bold">Create account</h1>
      <p className="mt-1 text-sm text-foreground-secondary">Start prediction markets with your friends.</p>
      {errorMessage ? <p className="mt-3 rounded-xl bg-decrease/10 p-3 text-sm text-decrease">{errorMessage}</p> : null}
      <form action={signupAction} className="mt-6 grid gap-3">
        <input name="firstName" required placeholder="First name" className="rounded-xl border border-border bg-background-secondary p-3 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        <input name="lastName" required placeholder="Last name" className="rounded-xl border border-border bg-background-secondary p-3 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        <input name="email" type="email" required placeholder="Email" className="rounded-xl border border-border bg-background-secondary p-3 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        <input name="password" type="password" required minLength={8} placeholder="Password (min 8 chars)" className="rounded-xl border border-border bg-background-secondary p-3 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        <button className="rounded-xl bg-brand px-4 py-3 font-semibold text-brand-dark transition hover:bg-brand-hover">Sign up</button>
      </form>
      <p className="mt-4 text-sm text-foreground-secondary">
        Already have an account?{" "}
        <Link className="font-semibold text-brand-dark underline" href="/login">
          Log in
        </Link>
      </p>
    </div>
  );
}
