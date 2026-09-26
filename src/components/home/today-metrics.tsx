"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import { CalendarIcon, CheckIcon, FlameIcon } from "@/components/ui/icons";
import { buildTodayMetrics } from "@/lib/today";

const noopSubscribe = () => () => {};

/**
 * "Tu progreso" bar. Completion dates are the viewer's calendar day stored as
 * UTC midnight, so "today" must come from the browser's clock: the server
 * (UTC on Vercel) is already on the next day during the viewer's evening.
 * Server render and hydration use `serverNow`, then the browser recomputes.
 */
export function TodayMetrics({
  completedAt,
  serverNow,
}: {
  completedAt: string[];
  serverNow: string;
}) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const now = hydrated ? new Date() : new Date(serverNow);
  const metrics = buildTodayMetrics(
    completedAt.map((d) => new Date(d)),
    now,
  );

  if (
    metrics.completedToday === 0 &&
    metrics.completedThisWeek === 0 &&
    metrics.streak === 0
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-meta font-medium text-muted dark:text-white">
          Tu progreso
        </p>
        {metrics.streak > 0 && (
          <span className="tabular inline-flex items-center gap-1.5 rounded-full border border-line bg-raised py-1 pl-2 pr-3 text-[13px] font-semibold">
            <FlameIcon className="size-[18px]" />
            {metrics.streak}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MetricCell
          label="completadas hoy"
          value={metrics.completedToday}
          tint="rgba(111, 197, 154, 0.16)"
          icon={<CheckIcon className="size-[17px] text-status-done" />}
        />
        <MetricCell
          label="esta semana"
          value={metrics.completedThisWeek}
          tint="rgba(143, 164, 245, 0.16)"
          icon={<CalendarIcon className="size-[17px] text-accent" />}
        />
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tint: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-panel border border-line bg-raised p-3 shadow-panel">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: tint }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="tabular text-[19px] font-semibold leading-tight tracking-tight">
          {value}
        </p>
        <p className="truncate text-[11px] leading-tight text-muted">{label}</p>
      </div>
    </div>
  );
}
