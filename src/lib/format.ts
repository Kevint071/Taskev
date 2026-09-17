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

/** True when a UTC-midnight due date falls before the local calendar day of `now`. */
export function isOverdue(iso: string | Date, now = new Date()): boolean {
  const due = typeof iso === "string" ? new Date(iso) : iso;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return due.getTime() < today;
}
