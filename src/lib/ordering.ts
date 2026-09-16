export const POSITION_GAP = 1000;

/** Position for a task appended to the end of an existing list. */
export function positionAtEnd(lastPosition: number | null): number {
  return lastPosition === null ? POSITION_GAP : lastPosition + POSITION_GAP;
}

/**
 * Position for a task inserted between two neighbours (either may be absent,
 * meaning "start of list" / "end of list" respectively).
 */
export function positionBetween(
  before: number | null,
  after: number | null,
): number {
  if (before === null && after === null) return POSITION_GAP;
  if (before === null) return (after as number) / 2;
  if (after === null) return before + POSITION_GAP;
  return (before + after) / 2;
}

/** Evenly spaced positions used to renormalize a full ordered list. */
export function renormalizedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * POSITION_GAP);
}
