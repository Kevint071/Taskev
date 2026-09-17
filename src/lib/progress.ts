export const PROGRESS_MIN = 0;
export const PROGRESS_MAX = 100;
export const PROGRESS_STEP = 10;

export function clampProgress(value: number): number {
  return Math.min(PROGRESS_MAX, Math.max(PROGRESS_MIN, Math.round(value)));
}

/** Adds `direction * PROGRESS_STEP`, staying within 0–100. */
export function stepProgress(current: number, direction: 1 | -1): number {
  return clampProgress(current + direction * PROGRESS_STEP);
}

/**
 * Parses what the user typed. Returns the rounded, clamped value, or null when
 * the input is empty or not numeric (the caller should restore the last value).
 */
export function parseProgressInput(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return clampProgress(value);
}
