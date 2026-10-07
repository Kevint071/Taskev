"use client";

import Link from "next/link";
import { type CSSProperties, useSyncExternalStore } from "react";
import { STATUS_LABELS } from "@/components/group-types";
import { STATUS_TONE, StatusIcon } from "@/components/ui/status-badge";
import { taskHref } from "@/lib/back-navigation";
import type { OverviewTask } from "@/lib/data/repositories/overview";
import { formatTimeLeft } from "@/lib/format";
import { dayClock, dueOnDay, startOfDayKey } from "@/lib/today";
import { PriorityChip, ProgressMeter } from "./task-chips";

const MINUTE_MS = 60_000;
const STEP_MS = 70;
/** Under this many minutes left, the countdown turns red. */
const LATE_MINUTES = 180;

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
 * Above the list, the day as a track: the stretch still left before midnight
 * is drawn in from the right and the countdown sits at its end, red in the
 * last hours. Each task is a bare row: its status glyph, title and group, and
 * on the right its priority and progress. Blocked or paused tasks name their
 * status, since that is what puts the deadline at risk.
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

      <DayTrack now={now} />

      <ul className="-mx-3 flex flex-col gap-0.5">
        {due.map((task, i) => {
          const tone = STATUS_TONE[task.status];
          const delay = 240 + i * STEP_MS;
          const atRisk =
            task.status === "bloqueada" || task.status === "pausada";
          return (
            <li
              key={task.id}
              className="animate-rise min-w-0"
              style={{ "--delay": `${delay}ms` } as CSSProperties}
            >
              <Link
                href={taskHref(task.groupId, task.id, "hoy")}
                className="group/row grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-raised active:bg-sunken"
              >
                <StatusIcon
                  status={task.status}
                  progressPct={task.progressPct}
                  className="mt-1.25 size-4"
                />

                <div className="flex min-w-0 flex-col">
                  <p className="line-clamp-2 wrap-break-word text-body font-medium transition-colors group-hover/row:text-accent">
                    {task.title}
                  </p>
                  <p className="flex min-w-0 items-center gap-3 text-meta text-muted">
                    <span className="min-w-0 truncate">{task.groupName}</span>
                    {atRisk && (
                      <span
                        className="shrink-0 font-medium"
                        style={{ color: tone }}
                      >
                        {STATUS_LABELS[task.status]}
                      </span>
                    )}
                  </p>
                </div>

                <div className="mt-0.5 flex items-center gap-4">
                  <PriorityChip priority={task.priority} plain />
                  <div className="hidden w-28 sm:block">
                    <ProgressMeter
                      pct={task.progressPct}
                      tone={tone}
                      delay={delay + 320}
                    />
                  </div>
                  <span className="tabular w-9 text-right text-meta text-muted sm:hidden">
                    {task.progressPct}%
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Today from midnight to midnight, with what's left of it in the accent (red
 * once under `LATE_MINUTES`) and a marker at the current minute. Until the
 * browser's clock is known it holds its height empty, so nothing jumps.
 */
function DayTrack({ now }: { now: Date | null }) {
  if (!now) return <div aria-hidden="true" className="h-5" />;

  const { minutesLeft, elapsedPct } = dayClock(now);
  const color = minutesLeft < LATE_MINUTES ? "var(--danger)" : "var(--accent)";
  const label = formatTimeLeft(minutesLeft);

  return (
    <div className="flex h-5 items-center gap-3">
      <span
        aria-hidden="true"
        className="relative h-1 flex-1 rounded-full bg-line"
      >
        <span
          className="animate-bar-fill absolute inset-y-0 right-0 rounded-full"
          style={
            {
              left: `${elapsedPct}%`,
              backgroundColor: color,
              transformOrigin: "right",
            } as CSSProperties
          }
        />
        <span
          className="animate-node-pop absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
          style={
            {
              left: `${elapsedPct}%`,
              backgroundColor: color,
              "--delay": "600ms",
            } as CSSProperties
          }
        />
      </span>
      <span
        className="tabular shrink-0 text-meta font-semibold"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
