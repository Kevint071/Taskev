"use client";

import Link from "next/link";
import { type CSSProperties, useSyncExternalStore } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";
import { STATUS_TONE } from "@/components/ui/status-badge";
import { taskHref } from "@/lib/back-navigation";
import type { OverviewTask } from "@/lib/data/repositories/overview";
import { dueOnDay, startOfDayKey } from "@/lib/today";
import { PriorityChip, ProgressDial, StatusChip } from "./task-chips";

const MINUTE_MS = 60_000;
const STEP_MS = 70;

// The current minute, ticking while the page is open; null on the server.
function subscribeMinute(onTick: () => void) {
  const id = setInterval(onTick, MINUTE_MS / 4);
  return () => clearInterval(id);
}
const minuteSnapshot = () => Math.floor(Date.now() / MINUTE_MS);
const serverMinute = () => null;

/**
 * The "Vence hoy" list. Which day that is depends on the viewer's clock, so
 * the server sends the tasks due around it plus its best guess
 * (`serverToday`, from the time zone cookie) for server render and
 * hydration; the browser then settles the day from its own clock. Renders
 * nothing when no task is due.
 *
 * The tasks are rows in one panel, styled like the `lg` rows of `TopTasks`
 * minus the rank: a status stripe, the title over a line with group, status
 * and priority, and a progress ring on the right.
 */
export function DueTodaySection({
  tasks,
  serverToday,
}: {
  tasks: OverviewTask[];
  serverToday: number;
}) {
  const minute = useSyncExternalStore(
    subscribeMinute,
    minuteSnapshot,
    serverMinute,
  );
  const now = minute === null ? null : new Date(minute * MINUTE_MS);
  const today = now ? startOfDayKey(now) : serverToday;
  const due = dueOnDay(tasks, today);

  if (due.length === 0) return null;

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-section font-semibold">
        Vence hoy
        <span className="tabular ml-2 font-medium text-muted">
          {due.length}
        </span>
      </h2>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-raised shadow-panel">
        {due.map((task, i) => {
          const tone = STATUS_TONE[task.status];
          const delay = 240 + i * STEP_MS;
          return (
            <li key={task.id} className="min-w-0">
              <Link
                href={taskHref(task.groupId, task.id, "hoy")}
                style={
                  { "--tone": tone, "--delay": `${delay}ms` } as CSSProperties
                }
                className="animate-rise group/card relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors duration-300 ease-out hover:bg-sunken"
              >
                {/* The status color as a stripe that draws itself down the left edge. */}
                <span
                  aria-hidden="true"
                  className="animate-grow-y absolute inset-y-3 left-0 w-1 rounded-r-full bg-(--tone)"
                  style={{ "--delay": `${delay + 200}ms` } as CSSProperties}
                />

                <p className="col-start-1 row-start-1 min-w-0 truncate text-[0.9375rem] font-semibold leading-6">
                  {task.title}
                </p>

                <div className="col-start-1 row-start-2 flex min-w-0 flex-wrap items-center gap-2">
                  <p className="max-w-44 truncate pr-1 text-meta text-muted">
                    {task.groupName}
                  </p>
                  <StatusChip status={task.status} plain />
                  <PriorityChip priority={task.priority} plain />
                </div>

                <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-3">
                  <ProgressDial
                    pct={task.progressPct}
                    tone={tone}
                    delay={delay + 320}
                  />
                  <ChevronRightIcon className="size-4 shrink-0 text-muted transition-transform duration-300 group-hover/card:translate-x-1 group-hover/card:text-accent" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
