"use client";

import { useState } from "react";

type DeadlineInputProps = {
  className?: string;
  required?: boolean;
};

export function DeadlineInput({ className, required }: DeadlineInputProps) {
  const [localValue, setLocalValue] = useState("");

  const isoValue = localValue ? new Date(localValue).toISOString() : "";

  return (
    <>
      <input type="hidden" name="deadline" value={isoValue} />
      <input
        type="datetime-local"
        required={required}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className={className}
      />
    </>
  );
}
