import { compareByRelevance, isActionable } from "./relevance";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const WEEK_WINDOW_DAYS = 7;

export type TodayTask = {
  id: string;
  status: string;
  dueDate: Date | null;
  relevance: number | null;
  progressPct: number;
  /** Forced into `top` ahead of every non-pinned task, still by relevance among themselves. */
  pinnedToday: boolean;
};

export type TodaySections<T extends TodayTask> = {
  top: T[];
  overdue: T[];
  dueToday: T[];
  thisWeek: T[];
};

export const TOP_TASKS_LIMIT = 3;

/**
 * Due dates are stored as UTC midnight of the chosen calendar day, so "today"
 * is the calendar day of `now` expressed the same way.
 */
export function startOfDayKey(now: Date): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Splits tasks into the "Hoy" sections. `top` holds the workable open tasks
 * (not blocked or paused) with the highest relevance, up to `topLimit`, ties
 * broken by progress; shown separately as today's featured priorities. Tasks
 * pinned for today (`pinnedToday`) always fill those slots first, ahead of
 * relevance, so an explicit "fijar" always wins a spot — among themselves,
 * and among the rest once pinned slots run out, relevance still decides.
 * They also appear in the lists below if their due date qualifies, and those lists
 * do include blocked and paused tasks, so they reflect every matching task. `dueToday`
 * is kept separate from `thisWeek` so today's agenda doesn't get lost in the
 * week's noise. Overdue wins over due-today, which wins over this week;
 * completed tasks are ignored. Lists are sorted by due date, earliest first.
 */
export function buildTodaySections<T extends TodayTask>(
  tasks: T[],
  now: Date,
  topLimit: number = TOP_TASKS_LIMIT,
): TodaySections<T> {
  const open = tasks.filter((t) => t.status !== "completada");

  const workable = open.filter((t) => isActionable(t.status));
  const pinned = workable.filter((t) => t.pinnedToday).sort(compareByRelevance);
  const rest = workable.filter((t) => !t.pinnedToday).sort(compareByRelevance);
  const top = [...pinned, ...rest].slice(0, topLimit);

  const today = startOfDayKey(now);
  const weekEnd = today + WEEK_WINDOW_DAYS * MS_PER_DAY;
  const overdue: T[] = [];
  const dueToday: T[] = [];
  const thisWeek: T[] = [];

  for (const task of open) {
    if (!task.dueDate) continue;
    const due = task.dueDate.getTime();
    if (due < today) overdue.push(task);
    else if (due === today) dueToday.push(task);
    else if (due <= weekEnd) thisWeek.push(task);
  }

  const byDue = (a: T, b: T) =>
    (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0);

  return {
    top,
    overdue: overdue.sort(byDue),
    dueToday: dueToday.sort(byDue),
    thisWeek: thisWeek.sort(byDue),
  };
}

type DatedTask = Pick<TodayTask, "status" | "dueDate">;

/** Open tasks due on the calendar day `dayKey` (UTC midnight, like stored due dates). */
export function dueOnDay<T extends DatedTask>(tasks: T[], dayKey: number): T[] {
  return tasks.filter(
    (t) => t.status !== "completada" && t.dueDate?.getTime() === dayKey,
  );
}

/**
 * Open tasks due the day before, on, or after `dayKey`. Around the UTC day,
 * that covers every viewer's "today" whatever their time zone, so the browser
 * can pick its own day out of it with `dueOnDay`.
 */
export function dueAroundDay<T extends DatedTask>(
  tasks: T[],
  dayKey: number,
): T[] {
  return tasks.filter((t) => {
    if (t.status === "completada" || !t.dueDate) return false;
    return Math.abs(t.dueDate.getTime() - dayKey) <= MS_PER_DAY;
  });
}

export type TodayMetrics = {
  completedToday: number;
  completedThisWeek: number;
};

/**
 * Completion metrics for the "Hoy" ritual: how much closed today and in the
 * last seven days. `completedAt` is stored as UTC midnight of the chosen
 * calendar day, same as `dueDate`, so it's compared directly against `now`'s
 * day key rather than re-derived.
 */
export function buildTodayMetrics(
  completedAtDates: (Date | null)[],
  now: Date,
): TodayMetrics {
  const today = startOfDayKey(now);
  const weekStart = today - (WEEK_WINDOW_DAYS - 1) * MS_PER_DAY;
  let completedToday = 0;
  let completedThisWeek = 0;

  for (const date of completedAtDates) {
    if (!date) continue;
    const day = date.getTime();
    if (day === today) completedToday++;
    if (day >= weekStart && day <= today) completedThisWeek++;
  }

  return { completedToday, completedThisWeek };
}

export type WeekDay = {
  /** UTC midnight of the calendar day, like stored due and completion dates. */
  dayKey: number;
  count: number;
};

/**
 * Completions per calendar day over the last `WEEK_WINDOW_DAYS` days, oldest
 * first and ending today: the bars of the "Hoy" progress chart. Dates outside
 * the window (older, or after today) are ignored.
 */
export function buildWeekActivity(
  completedAtDates: (Date | null)[],
  now: Date,
): WeekDay[] {
  const today = startOfDayKey(now);
  const week: WeekDay[] = Array.from({ length: WEEK_WINDOW_DAYS }, (_, i) => ({
    dayKey: today - (WEEK_WINDOW_DAYS - 1 - i) * MS_PER_DAY,
    count: 0,
  }));

  for (const date of completedAtDates) {
    if (!date) continue;
    const slot = week.find((day) => day.dayKey === date.getTime());
    if (slot) slot.count++;
  }

  return week;
}
