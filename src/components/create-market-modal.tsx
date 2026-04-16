"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CreateMarketForm } from "@/components/create-market-form";
import { overrideModerationAction } from "@/app/actions";

type MemberOption = {
  userId: string;
  name: string;
};

type CreateMarketModalProps = {
  groupId: string;
  members: MemberOption[];
  moderation?: {
    rejected: boolean;
    reason: string;
    logId: string | null;
    canOverride: boolean;
  };
};

export function CreateMarketButton({ groupId, members, moderation }: CreateMarketModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (moderation?.rejected && !dismissed) setOpen(true);
  }, [moderation, dismissed]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setShowOverrideForm(false);
    if (moderation?.rejected && !dismissed) {
      setDismissed(true);
      router.replace(`/groups/${groupId}`, { scroll: false });
    }
  }, [moderation, dismissed, router, groupId]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleClose]);

  const isRejected = moderation?.rejected && !dismissed && open;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover"
      >
        + New market
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh] sm:items-center sm:pt-0">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {isRejected ? "Market not created" : "Create market"}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-tertiary transition hover:bg-background-secondary hover:text-foreground"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {isRejected ? (
              <div className="mt-3 grid gap-3">
                <div className="rounded-xl bg-decrease/10 p-4">
                  <p className="text-sm font-semibold text-decrease">
                    This question was flagged by our moderation system.
                  </p>
                  <p className="mt-1 text-sm text-foreground-secondary">
                    {moderation.reason}
                  </p>
                </div>

                {moderation.canOverride && moderation.logId ? (
                  showOverrideForm ? (
                    <div className="grid gap-3">
                      <p className="text-sm text-foreground-secondary">
                        As the group owner, you can override this decision and create the market anyway. Fill in the remaining details:
                      </p>
                      <form action={overrideModerationAction} className="grid gap-2 md:grid-cols-2">
                        <input type="hidden" name="logId" value={moderation.logId} />
                        <input
                          type="datetime-local"
                          name="deadline"
                          required
                          className="rounded-xl border border-border bg-background-secondary p-2.5 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 md:col-span-1"
                        />
                        <select
                          name="umpireId"
                          required
                          defaultValue=""
                          className="rounded-xl border border-border bg-background-secondary p-2.5 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 md:col-span-1"
                        >
                          <option value="" disabled>Select Umpire</option>
                          {members.map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2 md:col-span-2">
                          <button
                            type="button"
                            onClick={() => setShowOverrideForm(false)}
                            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground-secondary transition hover:bg-background-secondary"
                          >
                            Cancel
                          </button>
                          <button className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600">
                            Override &amp; create
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground-secondary transition hover:bg-background-secondary"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowOverrideForm(true)}
                        className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
                      >
                        Create anyway
                      </button>
                    </div>
                  )
                ) : (
                  <div className="grid gap-2">
                    <p className="text-sm text-foreground-tertiary">
                      If you believe this was a mistake, contact your group owner.
                    </p>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground-secondary transition hover:bg-background-secondary"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <CreateMarketForm groupId={groupId} members={members} />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
