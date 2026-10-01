import { type FormEvent, useRef, useState } from "react";
import { SendIcon } from "@/components/ui/icons";
import { autosize } from "./use-autosize";

/** Sticky box at the bottom of the task for writing a new log entry. */
export function CommentComposer({ onAdd }: { onAdd: (body: string) => void }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onAdd(body);
    setDraft("");
    // Shrink the composer back to one line now that it is empty.
    if (inputRef.current) inputRef.current.style.height = "auto";
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 z-10 mt-auto bg-linear-to-t from-surface from-65% to-transparent pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-end gap-1 rounded-3xl border border-line-strong bg-raised py-1 pr-1 pl-4 shadow-lg shadow-black/5 transition-colors focus-within:border-accent">
        <textarea
          ref={inputRef}
          rows={1}
          enterKeyHint="send"
          aria-label="Nueva nota en la bitácora"
          placeholder="Añadir una nota…"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            autosize(e.target);
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="max-h-36 min-h-9 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-[15px] leading-6 text-ink caret-accent outline-none placeholder:text-muted focus-visible:shadow-none"
        />
        <button
          type="submit"
          aria-label="Añadir nota"
          disabled={!draft.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent/90 disabled:bg-line disabled:text-muted"
        >
          <SendIcon className="size-4.5" />
        </button>
      </div>
    </form>
  );
}
