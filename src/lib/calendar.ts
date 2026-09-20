export const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"] as const;

export type CalendarDay = {
  date: Date;
  day: number;
  inMonth: boolean;
};

/**
 * Monday-first grid of full weeks covering `month` (0-indexed) of `year`, in
 * UTC — matching how due/completion dates are stored (UTC midnight).
 */
export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7;
  const gridStart = new Date(Date.UTC(year, month, 1 - firstWeekday));

  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));
  const lastWeekday = (lastOfMonth.getUTCDay() + 6) % 7;
  const totalDays = firstWeekday + lastOfMonth.getUTCDate() + (6 - lastWeekday);

  const days: CalendarDay[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + i);
    days.push({
      date,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
    });
  }
  return days;
}

export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function utcMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

/** "Today" expressed as UTC midnight, matching how dates are stored. */
export function todayUtcMidnight(now = new Date()): Date {
  return utcMidnight(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

const MS_PER_DAY = 86_400_000;

/** Whole calendar days from `from` to `date` (negative when `date` is earlier). */
export function daysBetweenUtc(
  date: Date,
  from: Date = todayUtcMidnight(),
): number {
  return Math.round((date.getTime() - from.getTime()) / MS_PER_DAY);
}

/** First Monday strictly after `date`. */
export function nextMondayUtc(date: Date): Date {
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  return addDaysUtc(date, 7 - weekday);
}

const monthYearFormat = new Intl.DateTimeFormat("es", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatMonthYear(date: Date): string {
  const label = monthYearFormat.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
