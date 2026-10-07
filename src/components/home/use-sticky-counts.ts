import { useState } from "react";

/**
 * Counts for a row whose items collapse out at zero. A count that drops to zero
 * keeps its last value, so the item fades out still reading what it said
 * instead of flashing a "0" on its way out.
 */
export function useStickyCounts<K extends string>(
  counts: Record<K, number>,
): Record<K, number> {
  const [sticky, setSticky] = useState(counts);
  let next = sticky;
  for (const key in counts) {
    if (counts[key] > 0 && counts[key] !== next[key]) {
      next = { ...next, [key]: counts[key] };
    }
  }
  // Adjusting state while rendering: React re-renders right away, before paint.
  if (next !== sticky) setSticky(next);
  return next;
}
