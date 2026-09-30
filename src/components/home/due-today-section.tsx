"use client";

import Link from "next/link";
import { type CSSProperties, useSyncExternalStore } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";
import { STATUS_TONE } from "@/components/ui/status-badge";
import { taskHref } from "@/lib/back-navigation";
import type { OverviewTask } from "@/lib/data/overview";
import { dueOnDay, startOfDayKey } from "@/lib/today";
import { PriorityChip, ProgressMeter, StatusChip } from "./task-chips";

const noopSubscribe = () => () => {};

const STEP_MS = 70;

/**
 * The "Vence hoy" list. Which day that is depends on the viewer's clock, so
 * the server sends the tasks due around it plus its best guess
 * (`serverToday`, from the time zone cookie) for server render and
 * hydration; the browser then settles the day from its own clock. Renders
 * nothing when no task is due.
 *
 * Each task is a tile with its status color on the left edge, its group, and
 * a row of plain status and priority labels plus the progress bar (empty at
 * 0%, so every tile has the same layout).
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
      <div className="flex items-center gap-2.5">
        <h2 className="text-section font-semibold">Vence hoy</h2>
        <span className="tabular rounded-full bg-accent-soft px-2 py-0.5 text-meta font-semibold text-accent">
          {due.length}
        </span>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {due.map((task, i) => {
          const tone = STATUS_TONE[task.status];
          const delay = i * STEP_MS;
          return (
            <li
              key={task.id}
              className="animate-rise min-w-0"
              style={{ "--delay": `${delay}ms` } as CSSProperties}
            >
              <Link
                href={taskHref(task.groupId, task.id, "hoy")}
                style={{ "--tone": tone } as CSSProperties}
                className="group/tile relative flex h-full min-w-0 flex-col gap-3 rounded-xl border border-line bg-raised py-4 pr-4 pl-5 shadow-panel transition-[translate,scale,background-color,border-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tone)_50%,var(--line))] hover:bg-sunken hover:shadow-[0_10px_24px_-16px_color-mix(in_srgb,var(--ink)_55%,transparent)] active:scale-[0.99]"
              >
                <span
                  aria-hidden="true"
                  className="animate-grow-y absolute inset-y-3 left-0 w-1 rounded-r-full bg-(--tone)"
                  style={{ "--delay": `${delay + 200}ms` } as CSSProperties}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="min-w-0 truncate text-meta text-muted">
                      {task.groupName}
                    </p>
                    <p className="line-clamp-2 min-h-13 wrap-break-word text-body font-medium">
                      {task.title}
                    </p>
                  </div>
                  <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted transition-transform duration-300 group-hover/tile:translate-x-1 group-hover/tile:text-accent" />
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={task.status} plain />
                    <PriorityChip priority={task.priority} plain />
                  </div>

                  <ProgressMeter
                    pct={task.progressPct}
                    tone={tone}
                    delay={delay + 320}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
