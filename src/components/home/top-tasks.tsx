import Link from "next/link";
import type { CSSProperties } from "react";
import { STATUS_LABELS } from "@/components/group-types";
import { STATUS_TONE } from "@/components/ui/status-badge";
import { taskHref } from "@/lib/back-navigation";
import type { OverviewTask } from "@/lib/data/overview";
import { DueLabel } from "./due-label";

const STEP_MS = 140;

/**
 * The day's top tasks as a queue: a dashed thread runs down the left edge and
 * each task hangs from it on a numbered node, so the order of attack reads at a
 * glance. On load the nodes pop in one after another and the thread draws itself
 * down to the next one; only the first node is filled with the accent and pings.
 * Rows also show what is in flight: an "En curso" marker and progress once started.
 */
export function TopTasks({
  tasks,
  serverNow,
}: {
  tasks: OverviewTask[];
  serverNow: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-section font-semibold">
        {tasks.length > 1 ? "Prioridades de hoy" : "Siguiente tarea"}
      </h2>

      <ol>
        {tasks.map((task, i) => (
          <li
            key={task.id}
            className="animate-rise group/item relative grid grid-cols-[28px_minmax(0,1fr)] gap-x-3.5"
            style={{ "--delay": `${i * STEP_MS}ms` } as CSSProperties}
          >
            {/* The node sits at the row's vertical center, so the thread is split
                in two halves: below this node and above it (coming from the previous one). */}
            {i > 0 && (
              <span
                aria-hidden="true"
                className="animate-thread-draw absolute top-0 bottom-[calc(50%+14px)] left-3.25 border-l border-dashed border-line-strong"
                style={{ "--delay": `${i * STEP_MS + 380}ms` } as CSSProperties}
              />
            )}
            {i < tasks.length - 1 && (
              <span
                aria-hidden="true"
                className="animate-thread-draw absolute top-[calc(50%+14px)] bottom-0 left-3.25 border-l border-dashed border-line-strong"
                style={{ "--delay": `${i * STEP_MS + 260}ms` } as CSSProperties}
              />
            )}
            <span
              aria-hidden="true"
              className={`animate-node-pop tabular relative flex size-7 self-center items-center justify-center rounded-full text-meta font-semibold transition-colors ${
                i === 0
                  ? "bg-accent text-accent-ink ring-4 ring-accent/15"
                  : "border border-line-strong bg-surface text-muted group-hover/item:border-accent group-hover/item:text-accent"
              }`}
              style={{ "--delay": `${i * STEP_MS + 120}ms` } as CSSProperties}
            >
              {i === 0 && (
                <span
                  className="motion-safe:animate-node-ping absolute inset-0 rounded-full bg-accent"
                  style={{ "--delay": `${STEP_MS * 3}ms` } as CSSProperties}
                />
              )}
              <span className="relative">{i + 1}</span>
            </span>
            <TaskLink
              task={task}
              serverNow={serverNow}
              delay={i * STEP_MS + 320}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Progress({ pct, delay }: { pct: number; delay: number }) {
  return (
    <span
      role="img"
      aria-label={`Progreso ${pct}%`}
      className="inline-flex items-center gap-1.5"
    >
      <span
        aria-hidden="true"
        className="h-1 w-14 overflow-hidden rounded-full bg-sunken"
      >
        <span
          className="animate-bar-fill block h-full rounded-full bg-accent"
          style={{ width: `${pct}%`, "--delay": `${delay}ms` } as CSSProperties}
        />
      </span>
      <span aria-hidden="true" className="tabular text-meta text-muted">
        {pct}%
      </span>
    </span>
  );
}

function Meta({
  task,
  serverNow,
  delay,
}: {
  task: OverviewTask;
  serverNow: string;
  delay: number;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 md:justify-end">
      <p className="min-w-0 wrap-break-word text-meta text-muted">
        {task.groupName}
      </p>
      {task.progressPct > 0 && (
        <Progress pct={task.progressPct} delay={delay} />
      )}
      {task.dueDate && (
        <span className="inline-flex rounded-full bg-sunken px-2.5 py-0.5 text-meta font-semibold">
          <DueLabel
            dueDate={task.dueDate.toISOString()}
            serverNow={serverNow}
          />
        </span>
      )}
    </div>
  );
}

function TaskLink({
  task,
  serverNow,
  delay,
}: {
  task: OverviewTask;
  serverNow: string;
  delay: number;
}) {
  return (
    <Link
      href={taskHref(task.groupId, task.id, "hoy")}
      className="group/task relative -mx-2 flex min-w-0 flex-col gap-1 rounded-xl py-2.5 pr-4 pl-2 transition-[background-color,transform] duration-200 hover:bg-sunken active:scale-[0.99] md:flex-row md:items-center md:justify-between md:gap-6"
    >
      {/* The status as a colored bar on the right edge, like the task list's left one. */}
      <span
        aria-hidden="true"
        className="animate-grow-y absolute inset-y-2 right-0 w-0.75 rounded-full"
        style={
          {
            backgroundColor: STATUS_TONE[task.status],
            "--delay": `${delay}ms`,
          } as CSSProperties
        }
      />
      <span className="sr-only">Estado: {STATUS_LABELS[task.status]}. </span>
      <p className="min-w-0 wrap-break-word text-body font-medium md:flex-1">
        {task.title}
      </p>
      <div className="flex min-w-0 items-center gap-3 md:max-w-[45%] md:shrink-0">
        <Meta task={task} serverNow={serverNow} delay={delay} />
      </div>
    </Link>
  );
}
