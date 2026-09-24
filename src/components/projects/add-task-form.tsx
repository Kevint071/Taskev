"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { PlusIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";

/** "Añadir tarea" button that expands into the inline new-task form. */
export function AddTaskForm({
  onAdd,
  onTitleTooLong,
}: {
  /** Returns false when the task was not added, so the typed title is kept. */
  onAdd: (title: string) => boolean;
  onTitleTooLong: (message: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overflowRef = useRef(0);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function open() {
    setError(null);
    setAdding(true);
  }

  function close() {
    setAdding(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim().slice(0, MAX_TASK_TITLE_LENGTH);
    if (!trimmed) {
      setError("Escribe un título para la tarea");
      return;
    }
    if (!onAdd(trimmed)) return;
    setError(null);
    setTitle("");
    inputRef.current?.focus();
  }

  if (!adding) {
    return (
      <Button variant="secondary" onClick={open} className="self-start">
        <PlusIcon />
        Añadir tarea
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          close();
        }
      }}
      className="animate-reveal flex flex-col gap-2"
    >
      <div className="flex gap-4">
        <div className="relative min-w-0 flex-1">
          <Input
            ref={inputRef}
            type="text"
            aria-label="Título de la nueva tarea"
            placeholder="Añade una tarea y pulsa Enter"
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
            className="w-full pr-20"
          />
          <span className="tabular pointer-events-none absolute inset-y-0 right-3 flex items-center text-meta text-muted">
            {title.length}/{MAX_TASK_TITLE_LENGTH}
          </span>
        </div>
        <Button type="submit" variant="primary">
          Añadir
        </Button>
      </div>
      <FormError message={error} />
    </form>
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
