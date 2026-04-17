"use client";

import { useEffect, useState } from "react";

type LocalDateProps = {
  iso: string;
  style?: "datetime" | "date";
};

export function LocalDate({ iso, style = "datetime" }: LocalDateProps) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!iso) return;
    const d = new Date(iso);
    setText(style === "date" ? d.toLocaleDateString() : d.toLocaleString());
  }, [iso, style]);

  return <>{text}</>;
}
