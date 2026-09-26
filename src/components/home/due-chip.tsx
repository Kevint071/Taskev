"use client";

import { useSyncExternalStore } from "react";
import { daysBetweenUtc, todayUtcMidnight } from "@/lib/calendar";
import { formatDueRelative } from "@/lib/format";

const noopSubscribe = () => () => {};

/** Due within this many days (today included) reads as "soon". */
const SOON_DAYS = 1;

type Urgency = "overdue" | "soon" | "later";

const TONE: Record<"spotlight" | "card", Record<Urgency, string>> = {
  spotlight: {
    overdue: "bg-(--toast-error) text-(--toast-error-ink)",
    soon: "bg-(--toast-warning) text-(--toast-warning-ink)",
    later: "bg-white/15 text-white",
  },
  card: {
    overdue: "bg-danger/12 text-danger",
    soon: "bg-status-paused/15 text-status-paused",
    later: "bg-sunken text-muted",
  },
};

/**
 * "vence mañana", "venció hace 2 días": a pill toned by how close the due
 * date is. Like `TodayMetrics`, "today" must come from the browser's clock
 * (the server runs in UTC), so server render and hydration use `serverNow`.
 */
export function DueChip({
  dueDate,
  serverNow,
  variant,
}: {
  dueDate: string;
  serverNow: string;
  variant: "spotlight" | "card";
}) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const now = hydrated ? new Date() : new Date(serverNow);
  const days = daysBetweenUtc(new Date(dueDate), todayUtcMidnight(now));
  const urgency: Urgency =
    days < 0 ? "overdue" : days <= SOON_DAYS ? "soon" : "later";

  return (
    <span
      className={`tabular inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ${TONE[variant][urgency]}`}
    >
      {days < 0 ? "venció" : "vence"} {formatDueRelative(dueDate, now)}
    </span>
  );
}
