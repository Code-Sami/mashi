import Link from "next/link";
import type { ReactNode } from "react";

type MentionUser = {
  id: string;
  name: string;
};

type MarketQuestionWithMentionsProps = {
  question: string;
  taggedUsers: MentionUser[];
  className?: string;
  linkify?: boolean;
};

const mentionStyle = "font-semibold text-brand-dark underline decoration-brand/40 decoration-2 underline-offset-2 hover:decoration-brand";

export function MarketQuestionWithMentions({ question, taggedUsers, className, linkify = true }: MarketQuestionWithMentionsProps) {
  if (!taggedUsers.length) {
    return <span className={className}>{question}</span>;
  }

  const tokens = taggedUsers
    .map((user) => ({ user, token: `@${user.name}` }))
    .sort((a, b) => b.token.length - a.token.length);

  const nodes: ReactNode[] = [];
  let cursor = 0;

  while (cursor < question.length) {
    if (question[cursor] === "@") {
      const rest = question.slice(cursor);
      const restLower = rest.toLowerCase();
      let matched = false;

      for (const { user, token } of tokens) {
        if (restLower.startsWith(token.toLowerCase())) {
          if (cursor > 0 && nodes.length === 0) {
            nodes.push(question.slice(0, cursor));
          }
          const display = question.slice(cursor, cursor + token.length);
          if (linkify) {
            nodes.push(
              <Link key={`${user.id}-${cursor}`} href={`/users/${user.id}`} className={mentionStyle}>
                {display}
              </Link>
            );
          } else {
            nodes.push(
              <span key={`${user.id}-${cursor}`} className={mentionStyle}>
                {display}
              </span>
            );
          }
          cursor += token.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        cursor += 1;
      }
    } else {
      const nextAt = question.indexOf("@", cursor);
      if (nextAt === -1) {
        nodes.push(question.slice(cursor));
        cursor = question.length;
      } else {
        nodes.push(question.slice(cursor, nextAt));
        cursor = nextAt;
      }
    }
  }

  if (nodes.length === 0) {
    return <span className={className}>{question}</span>;
  }

  return <span className={className}>{nodes}</span>;
}
