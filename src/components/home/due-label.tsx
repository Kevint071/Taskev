"use client";

import { useSyncExternalStore } from "react";
import { daysBetweenUtc, todayUtcMidnight } from "@/lib/calendar";
import { formatDueRelative } from "@/lib/format";

const noopSubscribe = () => () => {};

/**
 * "vence mañana", "venció hace 2 días", toned like the task list's due chip:
 * red once overdue, accent on the day itself. Like `TodayMetrics`, "today"
 * must come from the browser's clock (the server runs in UTC), so server
 * render and hydration use `serverNow`.
 */
export function DueLabel({
  dueDate,
  serverNow,
}: {
  dueDate: string;
  serverNow: string;
}) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const now = hydrated ? new Date() : new Date(serverNow);
  const days = daysBetweenUtc(new Date(dueDate), todayUtcMidnight(now));
  const tone =
    days < 0 ? "text-danger" : days === 0 ? "text-accent" : "text-muted";

  return (
    <span className={`tabular shrink-0 whitespace-nowrap font-medium ${tone}`}>
      {days < 0 ? "venció" : "vence"} {formatDueRelative(dueDate, now)}
    </span>
  );
}
