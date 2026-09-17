const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const WEEK_WINDOW_DAYS = 7;

export type TodayTask = {
  id: string;
  status: string;
  dueDate: Date | null;
  relevance: number | null;
};

export type TodaySections<T extends TodayTask> = {
  next: T | null;
  overdue: T[];
  thisWeek: T[];
};

/**
 * Due dates are stored as UTC midnight of the chosen calendar day, so "today"
 * is the calendar day of `now` expressed the same way.
 */
export function startOfDayKey(now: Date): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Splits tasks into the "Hoy" sections. `next` is the open task with the
 * highest relevance and is not repeated below; overdue wins over this week;
 * completed tasks are ignored. Lists are sorted by due date, earliest first.
 */
export function buildTodaySections<T extends TodayTask>(
  tasks: T[],
  now: Date,
): TodaySections<T> {
  const open = tasks.filter((t) => t.status !== "completada");

  let next: T | null = null;
  for (const task of open) {
    if (next === null || (task.relevance ?? 0) > (next.relevance ?? 0)) {
      next = task;
    }
  }

  const today = startOfDayKey(now);
  const weekEnd = today + WEEK_WINDOW_DAYS * MS_PER_DAY;
  const overdue: T[] = [];
  const thisWeek: T[] = [];

  for (const task of open) {
    if (task === next || !task.dueDate) continue;
    const due = task.dueDate.getTime();
    if (due < today) overdue.push(task);
    else if (due <= weekEnd) thisWeek.push(task);
  }

  const byDue = (a: T, b: T) =>
    (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0);

  return {
    next,
    overdue: overdue.sort(byDue),
    thisWeek: thisWeek.sort(byDue),
  };
}
