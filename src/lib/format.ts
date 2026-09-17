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

export function formatShortDate(date: Date): string {
  return shortDate.format(date).replace(".", "");
}

export function formatLongDate(date: Date): string {
  return longDate.format(date);
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
