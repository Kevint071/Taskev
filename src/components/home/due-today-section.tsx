"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { taskHref } from "@/lib/back-navigation";
import type { OverviewTask } from "@/lib/data/overview";
import { dueOnDay, startOfDayKey } from "@/lib/today";

const noopSubscribe = () => () => {};

/**
 * The "Vence hoy" list. Which day that is depends on the viewer's clock, so
 * the server sends the tasks due around it plus its best guess
 * (`serverToday`, from the time zone cookie) for server render and
 * hydration; the browser then settles the day from its own clock. Renders
 * nothing when no task is due.
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
  const due = dueOnDay(tasks, today);

  if (due.length === 0) return null;

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-section font-semibold">Vence hoy</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-raised shadow-panel">
        {due.map((task) => (
          <li key={task.id}>
            <Link
              href={taskHref(task.groupId, task.id, "hoy")}
              className="flex min-w-0 items-baseline justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-sunken md:px-5"
            >
              <span className="min-w-0 truncate text-body font-medium">
                {task.title}
              </span>
              <span className="max-w-36 shrink-0 truncate text-meta text-muted">
                {task.groupName}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
