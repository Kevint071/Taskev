import { useEffect, useRef, useState } from "react";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";
import { FlashWrap } from "./flash-wrap";
import { autosize, useAutosize } from "./use-autosize";

/** Editable title; commits on blur or Enter, Escape reverts. */
export function TitleField({
  title,
  done,
  flashTick,
  onCommit,
}: {
  title: string;
  done: boolean;
  flashTick: number;
  onCommit: (title: string) => void;
}) {
  const [draft, setDraft] = useState(title);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Resync the draft if the task changes from outside (e.g. a reload).
  useEffect(() => setDraft(title), [title]);
  useAutosize(ref);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Draft changes trigger sizing after React updates the controlled textarea.
  useEffect(() => {
    autosize(ref.current);
  }, [draft]);

  function commit() {
    const trimmed = draft.trim().slice(0, MAX_TASK_TITLE_LENGTH);
    if (trimmed && trimmed !== title) onCommit(trimmed);
    else setDraft(title);
  }

  return (
    <FlashWrap tick={flashTick}>
      <label className="block">
        <span className="sr-only">Título de la tarea</span>
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            autosize(e.target);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setDraft(title);
            }
          }}
          rows={1}
          maxLength={MAX_TASK_TITLE_LENGTH}
          className={`-mx-1 block w-full resize-none overflow-hidden rounded-sm bg-transparent px-1 text-[23px] leading-7.25 font-semibold tracking-[-0.02em] text-pretty caret-accent outline-none focus-visible:shadow-none sm:text-page ${
            done ? "text-muted line-through decoration-1" : "text-ink"
          }`}
        />
      </label>
    </FlashWrap>
  );
}
