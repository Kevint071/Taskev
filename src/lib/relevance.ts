const MS_PER_DAY = 24 * 60 * 60 * 1000;
const URGENCY_MAX = 100;
const URGENCY_DECAY_DAYS = 14;
const PRIORITY_WEIGHT = 20;
const PROGRESS_WEIGHT = 0.5;

/**
 * Urgency from a due date: 0 with no due date, near its max when overdue or
 * due today, decaying toward 0 the farther away the due date is.
 */
export function computeUrgency(dueDate: Date | null, now: Date): number {
  if (!dueDate) return 0;
  const daysUntil = (dueDate.getTime() - now.getTime()) / MS_PER_DAY;
  const effectiveDays = Math.max(daysUntil, 0);
  return URGENCY_MAX * Math.exp(-effectiveDays / URGENCY_DECAY_DAYS);
}

/** Combined relevance score: weighted priority + urgency by due date + progress. */
export function computeRelevance(
  priority: number,
  dueDate: Date | null,
  now: Date,
  progressPct = 0,
): number {
  return (
    priority * PRIORITY_WEIGHT +
    computeUrgency(dueDate, now) +
    progressPct * PROGRESS_WEIGHT
  );
}
