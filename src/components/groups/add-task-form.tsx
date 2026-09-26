"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, PlusIcon } from "@/components/ui/icons";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";

/** Shortcut that opens the composer on desktop. */
export const NEW_TASK_SHORTCUT = "n";

const COMPOSER_INPUT_ID = "new-task-title";

/** Re-focuses an already open composer, e.g. one kept open with a draft. */
export function focusTaskComposer() {
  document.getElementById(COMPOSER_INPUT_ID)?.focus();
}

/** Desktop entry point, placed beside the group title. */
export function NewTaskButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-keyshortcuts={NEW_TASK_SHORTCUT.toUpperCase()}
      className="group hidden h-9 shrink-0 items-center gap-2 rounded-full bg-accent pr-2 pl-3.5 font-medium text-accent-ink shadow-sm shadow-accent/25 transition-[background-color,box-shadow,transform] hover:bg-accent/90 hover:shadow-md hover:shadow-accent/30 active:scale-[0.97] md:inline-flex"
    >
      <PlusIcon className="size-4 transition-transform duration-200 group-hover:rotate-90" />
      Nueva tarea
      <kbd className="ml-0.5 flex size-5 items-center justify-center rounded-[5px] bg-accent-ink/20 font-sans text-[11px] font-semibold">
        {NEW_TASK_SHORTCUT.toUpperCase()}
      </kbd>
    </button>
  );
}

/** Phone entry point, floating above the tab bar. */
export function NewTaskFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Nueva tarea"
      className="animate-fab-in fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-10 flex size-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-accent/35 ring-4 ring-surface transition-transform active:scale-90 md:hidden"
    >
      <PlusIcon className="size-6" />
    </button>
  );
}

/** Inline card for typing new tasks; stays open for quick successive entries. */
export function TaskComposer({
  onAdd,
  onTitleTooLong,
  onClose,
}: {
  /** Returns false when the task was not added, so the typed title is kept. */
  onAdd: (title: string) => boolean;
  onTitleTooLong: (message: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overflowRef = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
    // On phones the composer opens from the floating button, which may be
    // far below it: bring it into view above the keyboard.
    formRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The submit button is disabled while empty, which also blocks Enter.
    const trimmed = title.trim().slice(0, MAX_TASK_TITLE_LENGTH);
    if (!trimmed || !onAdd(trimmed)) return;
    setTitle("");
    inputRef.current?.focus();
  }

  // The counter only shows up once the limit is close enough to matter.
  const nearLimit = title.length >= MAX_TASK_TITLE_LENGTH * 0.8;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      onBlur={(e) => {
        // Leaving with a typed title keeps the draft open instead of losing it.
        if (
          !e.currentTarget.contains(e.relatedTarget as Node | null) &&
          !title.trim()
        ) {
          onClose();
        }
      }}
      className="animate-reveal scroll-mt-20 scroll-mb-28 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2 rounded-panel border border-accent/50 bg-raised py-1.5 pr-1.5 pl-3 shadow-panel ring-4 ring-accent/10 transition-shadow focus-within:border-accent">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-accent/70 text-accent">
          <PlusIcon className="size-3" />
        </span>
        <input
          ref={inputRef}
          id={COMPOSER_INPUT_ID}
          type="text"
          aria-label="Título de la nueva tarea"
          placeholder="¿Qué hay que hacer?"
          enterKeyHint="done"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (e.target.value.length < MAX_TASK_TITLE_LENGTH) {
              overflowRef.current = 0;
            }
          }}
          onKeyDown={(e) =>
            trackTitleOverflowAttempt(title.length, e.key, overflowRef, () =>
              onTitleTooLong(`Máximo: ${MAX_TASK_TITLE_LENGTH} caracteres.`),
            )
          }
          maxLength={MAX_TASK_TITLE_LENGTH}
          className="h-9 min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-muted"
        />
        {nearLimit && (
          <span className="tabular shrink-0 text-meta text-muted">
            {title.length}/{MAX_TASK_TITLE_LENGTH}
          </span>
        )}
        <button
          type="submit"
          aria-label="Añadir tarea"
          disabled={!title.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-control bg-accent text-accent-ink transition-[opacity,transform] active:scale-90 disabled:opacity-35"
        >
          <ArrowRightIcon className="size-4" />
        </button>
      </div>
      <p className="hidden px-1 text-right text-meta text-muted md:block">
        <kbd className="font-sans font-medium text-ink">Enter</kbd> para añadir
        · <kbd className="font-sans font-medium text-ink">Esc</kbd> para cerrar
      </p>
    </form>
  );
}

/** Whether a keydown should open the composer rather than go to a field. */
export function isNewTaskShortcut(event: KeyboardEvent) {
  if (event.key.toLowerCase() !== NEW_TASK_SHORTCUT) return false;
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
    return false;
  }
  const target = event.target as HTMLElement | null;
  return !target?.closest(
    "input, textarea, select, [contenteditable=''], [contenteditable='true'], dialog, [role='dialog']",
  );
}

const TITLE_OVERFLOW_WARNING_THRESHOLD = 5;

/** Warns after a few keystrokes attempted past the title limit, instead of on every one. */
function trackTitleOverflowAttempt(
  currentLength: number,
  key: string,
  counterRef: React.MutableRefObject<number>,
  onLimitReached: () => void,
) {
  if (currentLength < MAX_TASK_TITLE_LENGTH || key.length !== 1) return;
  counterRef.current += 1;
  if (counterRef.current >= TITLE_OVERFLOW_WARNING_THRESHOLD) {
    counterRef.current = 0;
    onLimitReached();
  }
}
