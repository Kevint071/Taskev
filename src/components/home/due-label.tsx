"use client";

import { useSyncExternalStore } from "react";
import { daysBetweenUtc, todayUtcMidnight } from "@/lib/calendar";
import { formatDueRelative } from "@/lib/format";

const noopSubscribe = () => () => {};

/**
 * "vence mañana", "venció hace 2 días", toned like the task list's due chip:
 * red once overdue, accent on the day itself. Like `TodayMetrics`, "today"
 * must come from the browser's clock (the server runs in UTC), so server
 * render and hydration use `serverNow`. `plain` keeps the surrounding text
 * color, for placing it on a solid accent fill where those tones wouldn't read.
 */
export function DueLabel({
  dueDate,
  serverNow,
  plain = false,
}: {
  dueDate: string;
  serverNow: string;
  plain?: boolean;
}) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const now = hydrated ? new Date() : new Date(serverNow);
  const days = daysBetweenUtc(new Date(dueDate), todayUtcMidnight(now));
  const tone = plain
    ? ""
    : days < 0
      ? "text-danger"
      : days === 0
        ? "text-accent"
        : "text-muted";

  return (
    <span className={`tabular shrink-0 whitespace-nowrap font-medium ${tone}`}>
      {days < 0 ? "venció" : "vence"} {formatDueRelative(dueDate, now)}
    </span>
  );
}
