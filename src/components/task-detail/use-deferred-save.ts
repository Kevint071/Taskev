import { useCallback, useEffect, useRef } from "react";

// Rapid taps on the slider or the stepper are coalesced into one save of the last value.
const DEFER_SAVE_MS = 400;

/**
 * Holds back a save while the user keeps adjusting a value: `schedule` restarts
 * the timer, `flush` saves right away, and leaving the screen flushes too.
 */
export function useDeferredSave<T>(save: (value: T) => void) {
  const saveRef = useRef(save);
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current) {
      const { value } = pending.current;
      pending.current = null;
      saveRef.current(value);
    }
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEFER_SAVE_MS);
    },
    [flush],
  );

  useEffect(() => flush, [flush]);

  return { schedule, flush };
}
