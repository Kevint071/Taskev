const MS_PER_DAY = 24 * 60 * 60 * 1000;
const URGENCY_MAX = 100;
const URGENCY_DECAY_DAYS = 14;
const PRIORITY_WEIGHT = 20;

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

/**
 * Relevance score: weighted priority + urgency by due date. Progress is
 * deliberately not part of it; it only breaks ties (see `compareByRelevance`).
 */
export function computeRelevance(
  priority: number,
  dueDate: Date | null,
  now: Date,
): number {
  return priority * PRIORITY_WEIGHT + computeUrgency(dueDate, now);
}

/**
 * Sort comparator, most relevant first. Equal relevance (same priority and
 * same due date) is broken first by `positionRank` — where the task sits in
 * its project's manual order, as a 0 (first) to 1 (last) percentile, so a
 * task you dragged up wins a tie before one you didn't — then by progress:
 * the task further along goes first, so you finish what you started.
 */
export function compareByRelevance(
  a: {
    relevance: number | null;
    progressPct: number;
    positionRank?: number | null;
  },
  b: {
    relevance: number | null;
    progressPct: number;
    positionRank?: number | null;
  },
): number {
  return (
    (b.relevance ?? 0) - (a.relevance ?? 0) ||
    (a.positionRank ?? 1) - (b.positionRank ?? 1) ||
    b.progressPct - a.progressPct
  );
}

/**
 * Percentile position within a same-project, manually ordered group: 0 for
 * the first item, 1 for the last, 0 when there's nothing to rank against.
 * Feeds `compareByRelevance`'s `positionRank` tie-break.
 */
export function positionRank(index: number, count: number): number {
  return count > 1 ? index / (count - 1) : 0;
}

/** Open tasks you can't work on right now; they never make the "Hoy" top. */
const NOT_ACTIONABLE = new Set(["bloqueada", "pausada"]);

export function isActionable(status: string): boolean {
  return !NOT_ACTIONABLE.has(status);
}

/**
 * Sort comparator for a project's automatic order: workable tasks first by
 * relevance, then blocked and paused ones (also by relevance) at the end.
 */
export function compareForProjectOrder(
  a: { status: string; relevance: number | null; progressPct: number },
  b: { status: string; relevance: number | null; progressPct: number },
): number {
  return (
    Number(!isActionable(a.status)) - Number(!isActionable(b.status)) ||
    compareByRelevance(a, b)
  );
}
