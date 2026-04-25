"use client";

import { useEffect, useRef } from "react";
import { acceptGroupInviteAction } from "@/app/actions";

type Props = {
  code: string;
};

export function AutoAcceptInvite({ code }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action={acceptGroupInviteAction} className="hidden">
      <input type="hidden" name="code" value={code} />
      <button type="submit">Join group</button>
    </form>
  );
}

