"use client";

import { useFormStatus } from "react-dom";

export function ProfileSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 rounded-xl bg-brand px-4 py-2.5 font-semibold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save profile"}
    </button>
  );
}
