import { useEffect, useState } from "react";

/**
 * Counts from 0 up to `target` with an ease-out curve. Deliberately ignores the
 * OS reduced-motion setting, like the rest of the group meter.
 */
export function useCountUp(target: number, delayMs = 0, durationMs = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    let startedAt = 0;
    const step = (now: number) => {
      startedAt ||= now;
      const t = Math.min((now - startedAt) / durationMs, 1);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, delayMs, durationMs]);

  return value;
}
