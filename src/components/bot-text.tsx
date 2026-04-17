import { Fragment } from "react";

const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const PAREN_WRAP = /^\(|\)$/g;

export function BotText({ text }: { text: string }) {
  const parts: Array<{ type: "text"; value: string } | { type: "link"; label: string; href: string }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MD_LINK)) {
    const before = text.slice(lastIndex, match.index);
    if (before) parts.push({ type: "text", value: before.replace(PAREN_WRAP, "") });
    parts.push({ type: "link", label: match[1], href: match[2] });
    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex);
  if (remaining) parts.push({ type: "text", value: remaining.replace(PAREN_WRAP, "") });

  if (parts.length === 0) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        part.type === "link" ? (
          <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-current/30 hover:decoration-current">
            {part.label}
          </a>
        ) : (
          <Fragment key={i}>{part.value}</Fragment>
        ),
      )}
    </>
  );
}
