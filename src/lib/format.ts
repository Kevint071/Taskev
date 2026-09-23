import { daysBetweenUtc, todayUtcMidnight } from "./calendar";

const shortDate = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
});

const longDate = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const dateTime = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const timeOnly = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
});

/** "18 sept". Due dates are stored as UTC midnight, so format in UTC. */
export function formatDueDate(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");
}

/** "Jue 24 sep". Due dates are stored as UTC midnight, so format in UTC. */
export function formatDueDateWithWeekday(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const label = new Intl.DateTimeFormat("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(/[.,]/g, "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "hoy" and "mañana" for imminent due dates; otherwise the weekday and date. */
export function formatDueDateForTaskChip(
  iso: string | Date,
  now = new Date(),
): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const days = daysBetweenUtc(date, todayUtcMidnight(now));
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return formatDueDateWithWeekday(date);
}

/** "2,5" — the decimal comma the rest of the UI uses. */
export function formatPriority(value: number | string): string {
  return String(Number(value)).replace(".", ",");
}

/** "hoy", "mañana", "en 5 días", "ayer", "hace 2 días" for a day offset from today. */
export function formatDayOffset(days: number): string {
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days > 1) return `en ${days} días`;
  if (days === -1) return "ayer";
  return `hace ${-days} días`;
}

const RELATIVE_DUE_DAYS = 7;

/** "hoy", "mañana", "hace 2 días" within a week of today; "18 sept" beyond. */
export function formatDueRelative(
  iso: string | Date,
  now = new Date(),
): string {
  const days = daysBetweenUtc(
    typeof iso === "string" ? new Date(iso) : iso,
    todayUtcMidnight(now),
  );
  if (Math.abs(days) <= RELATIVE_DUE_DAYS) return formatDayOffset(days);
  return formatDueDate(iso);
}

export function formatShortDate(date: Date): string {
  return shortDate.format(date).replace(".", "");
}

export function formatLongDate(date: Date): string {
  return longDate.format(date);
}

/** "14:32" — for entries already grouped under their day. */
export function formatTime(iso: string): string {
  return timeOnly.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso)).replace(".", "");
}

/** Truncates to the first `limit` words, appending "..." when text is cut. */
export function truncateWords(text: string, limit: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text;
  return `${words.slice(0, limit).join(" ")}...`;
}

/**
 * Human-friendly recency: relative for the last week ("hace 5 min", "ayer"),
 * falling back to an absolute date and time so older activity stays anchored.
 */
export function formatRelativeTime(
  iso: string | Date,
  now: Date = new Date(),
): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const seconds = Math.max(
    0,
    Math.round((now.getTime() - date.getTime()) / 1000),
  );

  if (seconds < 60) return "hace un momento";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.round(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;

  return formatDateTime(date.toISOString());
}

/** True when a UTC-midnight due date falls before the local calendar day of `now`. */
export function isOverdue(iso: string | Date, now = new Date()): boolean {
  const due = typeof iso === "string" ? new Date(iso) : iso;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return due.getTime() < today;
}
