import type { TaskStatus } from "./constraints";

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

/** A task can only become "completada" once its progress reaches 100%. */
export function canCompleteAtProgress(progressPct: number): boolean {
  return progressPct >= PROGRESS_MAX;
}

/**
 * A task can only return to "disponible" once it has no leftover progress and
 * no leftover completion date — both must be cleared (typically by passing
 * through another status first) before it counts as untouched again.
 */
export function blockedFromDisponible(
  progressPct: number,
  completedAt: unknown,
): "progress" | "completedAt" | null {
  if (progressPct !== PROGRESS_MIN) return "progress";
  if (completedAt) return "completedAt";
  return null;
}

export const COMPLETE_BLOCKED_MESSAGE =
  "El avance debe estar al 100 % para completar la tarea.";

export type StatusTransition =
  | { kind: "none" }
  | { kind: "apply" }
  | { kind: "confirmReset" }
  | { kind: "needCompletionDate" }
  | { kind: "blocked"; message: string };

/**
 * What picking `next` should do for a task in its current state: nothing,
 * apply it right away, confirm resetting progress back to "disponible", ask for
 * a completion date, or refuse with a message.
 */
export function statusTransition(
  next: TaskStatus,
  task: { status: TaskStatus; progressPct: number; completedAt: unknown },
): StatusTransition {
  if (next === task.status) return { kind: "none" };
  if (next === "completada") {
    return canCompleteAtProgress(task.progressPct)
      ? { kind: "needCompletionDate" }
      : { kind: "blocked", message: COMPLETE_BLOCKED_MESSAGE };
  }
  if (
    next === "disponible" &&
    blockedFromDisponible(task.progressPct, task.completedAt)
  ) {
    return { kind: "confirmReset" };
  }
  return { kind: "apply" };
}
