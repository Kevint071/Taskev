"use client";

import { useSyncExternalStore } from "react";
import { TaskSection } from "@/components/task-section";
import type { OverviewTask } from "@/lib/data/overview";
import { dueOnDay, startOfDayKey } from "@/lib/today";

const noopSubscribe = () => () => {};

/**
 * The "Hoy" list of tasks due today. Which day that is depends on the
 * viewer's clock, so the server sends the tasks due around it plus its best
 * guess (`serverToday`, from the time zone cookie) for server render and
 * hydration; the browser then settles the day from its own clock.
 */
export function DueTodaySection({
  tasks,
  serverToday,
}: {
  tasks: OverviewTask[];
  serverToday: number;
}) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const today = hydrated ? startOfDayKey(new Date()) : serverToday;

  return (
    <TaskSection
      title="Hoy"
      tasks={dueOnDay(tasks, today)}
      empty="Nada vence hoy"
      tone="accent"
      from="hoy"
    />
  );
}
