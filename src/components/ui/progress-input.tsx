"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  PROGRESS_MAX,
  PROGRESS_MIN,
  parseProgressInput,
  stepProgress,
} from "@/lib/progress";

// Rapid −/+ clicks are coalesced into a single save of the final value.
const STEP_SAVE_DELAY_MS = 350;

/**
 * Numeric 0–100 progress editor: −/+ step by 10 and save; typed values save on
 * blur or Enter; invalid input restores the last saved value. `onChange` fires
 * on every accepted value so the rest of the screen can update immediately.
 */
export function ProgressInput({
  value,
  onSave,
  onChange,
  label = "Avance",
}: {
  value: number;
  onSave: (value: number) => void;
  onChange?: (value: number) => void;
  label?: string;
}) {
  const id = useId();
  const [saved, setSaved] = useState(value);
  const [draft, setDraft] = useState(String(value));
  const [lastPropValue, setLastPropValue] = useState(value);
  const [pending, setPending] = useState<number | null>(null);
  const [lastSent, setLastSent] = useState(value);

  // Resync only when the task is reloaded with a new value and no local
  // change is waiting to be saved (a stale reload must not undo a click).
  if (value !== lastPropValue) {
    setLastPropValue(value);
    if (pending === null) {
      setSaved(value);
      setDraft(String(value));
      setLastSent(value);
    }
  }

  const onSaveRef = useRef(onSave);
  const pendingRef = useRef<number | null>(null);
  useEffect(() => {
    onSaveRef.current = onSave;
    pendingRef.current = pending;
  });

  useEffect(() => {
    if (pending === null) return;
    const timer = setTimeout(() => {
      onSaveRef.current(pending);
      setLastSent(pending);
      setPending(null);
    }, STEP_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  // Don't lose a queued save when the details panel closes.
  useEffect(
    () => () => {
      if (pendingRef.current !== null) onSaveRef.current(pendingRef.current);
    },
    [],
  );

  function step(direction: 1 | -1) {
    const next = stepProgress(saved, direction);
    setSaved(next);
    setDraft(String(next));
    setPending(next === lastSent ? null : next);
    onChange?.(next);
  }

  function commitDraft() {
    const parsed = parseProgressInput(draft);
    if (parsed === null) {
      setDraft(String(saved));
      return;
    }
    setSaved(parsed);
    setDraft(String(parsed));
    setPending(null);
    onChange?.(parsed);
    if (parsed !== lastSent) {
      setLastSent(parsed);
      onSave(parsed);
    }
  }

  const stepButton =
    "flex size-9 items-center justify-center text-body text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-meta font-medium text-muted">
        {label}
      </label>
      <div className="inline-flex w-fit items-stretch overflow-hidden rounded-control border border-line-strong bg-raised focus-within:border-accent">
        <button
          type="button"
          aria-label="Restar 10 al avance"
          className={`${stepButton} border-r border-line`}
          disabled={saved <= PROGRESS_MIN}
          onClick={() => step(-1)}
        >
          −
        </button>
        <div className="flex items-center pr-2.5">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={PROGRESS_MIN}
            max={PROGRESS_MAX}
            step={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
              } else if (e.key === "Escape") {
                setDraft(String(saved));
              }
            }}
            className="tabular h-9 w-9 bg-transparent text-right text-body font-medium focus-visible:shadow-none focus-visible:outline-none"
          />
          <span aria-hidden className="pl-0.5 text-muted">
            %
          </span>
        </div>
        <button
          type="button"
          aria-label="Sumar 10 al avance"
          className={`${stepButton} border-l border-line`}
          disabled={saved >= PROGRESS_MAX}
          onClick={() => step(1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
