"use client";

import { createMarketAction } from "@/app/actions";
import { DeadlineInput } from "@/components/deadline-input";
import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";

type MemberOption = {
  userId: string;
  name: string;
};

type CreateMarketFormProps = {
  groupId: string;
  members: MemberOption[];
};

function getMentionQuery(input: string, caretIndex: number) {
  const prefix = input.slice(0, caretIndex);
  const atIndex = prefix.lastIndexOf("@");
  if (atIndex < 0) return null;
  const between = prefix.slice(atIndex + 1);
  if (between.includes("\n")) return null;
  return { atIndex, query: between.trim().toLowerCase() };
}

function detectTaggedMembers(question: string, members: MemberOption[]) {
  const lowerQ = question.toLowerCase();
  const tagged = new Set<string>();
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  for (const member of sorted) {
    const token = `@${member.name.toLowerCase()}`;
    if (lowerQ.includes(token)) {
      tagged.add(member.userId);
    }
  }
  return [...tagged];
}

export function CreateMarketForm({ groupId, members }: CreateMarketFormProps) {
  const questionRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const [question, setQuestion] = useState("");
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAtIndex, setMentionAtIndex] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const taggedSet = useMemo(() => new Set(taggedUserIds), [taggedUserIds]);
  const suggestionList = useMemo(() => {
    if (mentionQuery === null) return [];
    return members
      .filter((member) => member.name.toLowerCase().includes(mentionQuery))
      .slice(0, 6);
  }, [members, mentionQuery]);

  function handleQuestionChange(value: string) {
    setQuestion(value);
    setReady(false);
    const input = questionRef.current;
    const caret = input?.selectionStart ?? value.length;
    const mention = getMentionQuery(value, caret);
    if (!mention) {
      setMentionQuery(null);
      setMentionAtIndex(null);
      return;
    }
    setMentionQuery(mention.query);
    setMentionAtIndex(mention.atIndex);
  }

  function insertMention(member: MemberOption) {
    const input = questionRef.current;
    if (!input) return;

    const caret = input.selectionStart ?? question.length;
    const atIndex = mentionAtIndex ?? question.lastIndexOf("@", caret);
    if (atIndex < 0) return;

    const nextQuestion = `${question.slice(0, atIndex)}@${member.name} ${question.slice(caret)}`;
    setQuestion(nextQuestion);
    if (!taggedSet.has(member.userId)) {
      setTaggedUserIds((prev) => [...prev, member.userId]);
    }
    setMentionQuery(null);
    setMentionAtIndex(null);
    setReady(false);

    requestAnimationFrame(() => {
      input.focus();
      const nextCaret = atIndex + member.name.length + 2;
      input.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (ready) {
      return;
    }

    if (submittingRef.current) {
      event.preventDefault();
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    event.preventDefault();
    const finalTagged = detectTaggedMembers(question, members);
    setTaggedUserIds(finalTagged);
    setReady(true);
    requestAnimationFrame(() => {
      formRef.current?.requestSubmit();
    });
  }

  return (
    <form ref={formRef} action={createMarketAction} onSubmit={handleSubmit} className="mt-3 grid gap-2 md:grid-cols-2">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="relative md:col-span-2">
        <input
          ref={questionRef}
          name="question"
          required
          value={question}
          onChange={(event) => handleQuestionChange(event.target.value)}
          placeholder="Yes/No question (use @ to mention people)"
          className="w-full rounded-xl border border-border bg-background-secondary p-2.5 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {mentionQuery !== null && suggestionList.length > 0 ? (
          <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-white p-1 shadow-lg">
            {suggestionList.map((member) => (
              <button
                key={member.userId}
                type="button"
                onClick={() => insertMention(member)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-brand/10"
              >
                <span className="font-medium text-brand-dark">@{member.name}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <DeadlineInput required className="rounded-xl border border-border bg-background-secondary p-2.5 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
      <select name="umpireId" required defaultValue="" className="rounded-xl border border-border bg-background-secondary p-2.5 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
        <option value="" disabled>Select Umpire</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name}
          </option>
        ))}
      </select>
      {taggedUserIds.map((userId) => (
        <input key={userId} type="hidden" name="taggedUserIds" value={userId} />
      ))}
      <label className="flex items-center gap-2 text-sm text-foreground-secondary md:col-span-2">
        <input type="checkbox" name="excludeTaggedUsers" className="h-4 w-4 rounded border-border accent-brand" />
        Exclude tagged users from betting
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground-secondary md:col-span-2">
        <input type="checkbox" name="excludeUmpire" className="h-4 w-4 rounded border-border accent-brand" />
        Exclude umpire from betting
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-semibold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
      >
        {isSubmitting ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-brand-dark/40 border-t-brand-dark"
              aria-hidden="true"
            />
            Creating...
          </>
        ) : (
          "Create market"
        )}
      </button>
    </form>
  );
}
