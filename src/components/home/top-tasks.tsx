import Link from "next/link";
import type { CSSProperties } from "react";
import { STATUS_LABELS } from "@/components/project-types";
import { ArrowRightIcon, PinIcon } from "@/components/ui/icons";
import { STATUS_TONE, StatusDot } from "@/components/ui/status-badge";
import { taskHref } from "@/lib/back-navigation";
import type { OverviewTask } from "@/lib/data/overview";
import { DueChip } from "./due-chip";

/**
 * The day's top tasks. The first one leads as a solid cobalt card; on desktop
 * it takes the left of a bento grid with the rest stacked beside it, on phones
 * it sits on top of a two-column row.
 */
export function TopTasks({
  tasks,
  serverNow,
}: {
  tasks: OverviewTask[];
  serverNow: string;
}) {
  const [hero, ...rest] = tasks;
  const heroSpan =
    rest.length === 0
      ? "md:col-span-full"
      : rest.length === 1
        ? "md:col-span-3"
        : "md:col-span-3 md:row-span-2";

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">
          {tasks.length > 1 ? "Prioridades de hoy" : "Siguiente tarea"}
        </h2>
        <Link
          href="/tasks"
          className="group/all inline-flex items-center gap-1 text-meta font-medium text-muted transition-colors hover:text-ink"
        >
          Ver todas
          <ArrowRightIcon className="size-3.5 transition-transform group-hover/all:translate-x-0.5" />
        </Link>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-3 max-[360px]:grid-cols-1 md:grid-cols-5">
        <HeroTile
          task={hero}
          serverNow={serverNow}
          className={`col-span-full ${heroSpan}`}
        />
        {rest.map((task, i) => (
          <SecondaryTile
            key={task.id}
            task={task}
            rank={i + 2}
            delay={(i + 1) * 70}
            serverNow={serverNow}
            alone={rest.length === 1}
          />
        ))}
      </div>
    </section>
  );
}

function HeroTile({
  task,
  serverNow,
  className,
}: {
  task: OverviewTask;
  serverNow: string;
  className: string;
}) {
  return (
    <Link
      href={taskHref(task.projectId, task.id, "hoy")}
      className={`group animate-rise relative isolate flex min-w-0 flex-col gap-5 overflow-hidden rounded-panel bg-linear-to-br from-spotlight-from to-spotlight-to p-5 text-spotlight-ink shadow-spotlight transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 md:p-7 ${className}`}
    >
      {/* Concentric rings bleeding off the top-right corner. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className="pointer-events-none absolute -right-16 -top-16 -z-10 size-64 text-white/[0.07] transition-transform duration-700 group-hover:rotate-12"
        fill="none"
        stroke="currentColor"
      >
        <circle cx="100" cy="100" r="98" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="74" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="50" strokeWidth="1.5" />
        <circle
          cx="100"
          cy="100"
          r="74"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="60 405"
          transform="rotate(100 100 100)"
          className="text-white/20"
        />
      </svg>

      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium leading-4 ring-1 ring-white/15 ring-inset">
          {task.pinnedToday && <PinIcon filled className="size-3.5" />}
          {task.pinnedToday ? "Fijada para hoy" : "Empieza por aquí"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white py-1.5 pl-3.5 pr-3 text-meta font-semibold text-spotlight-to shadow-sm transition-colors group-hover:bg-white/90">
          {task.progressPct > 0 ? "Continuar" : "Empezar"}
          <ArrowRightIcon className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <p className="truncate text-meta font-medium text-white/65">
          {task.projectName}
        </p>
        <p className="line-clamp-3 text-[22px] font-semibold leading-[28px] tracking-[-0.02em] text-balance md:text-[27px] md:leading-[33px]">
          {task.title}
        </p>
        {task.description?.trim() && (
          <p className="line-clamp-2 text-white/70">{task.description}</p>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <span className="text-meta font-medium text-white/65">Avance</span>
          <span className="tabular text-[22px] font-semibold leading-none tracking-[-0.02em]">
            {task.progressPct}
            <span className="ml-0.5 text-meta font-medium text-white/65">
              %
            </span>
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`Avance de ${task.title}`}
          aria-valuenow={task.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full bg-white/15"
        >
          <div
            className="animate-bar-grow h-full rounded-full bg-white"
            style={
              {
                width: `${task.progressPct}%`,
                "--delay": "200ms",
              } as CSSProperties
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {task.dueDate && (
            <DueChip
              dueDate={task.dueDate.toISOString()}
              serverNow={serverNow}
              variant="spotlight"
            />
          )}
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-white/15 px-2.5 text-[12px] font-medium">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-white"
            />
            {STATUS_LABELS[task.status]}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SecondaryTile({
  task,
  rank,
  delay,
  serverNow,
  alone,
}: {
  task: OverviewTask;
  rank: number;
  delay: number;
  serverNow: string;
  /** The only card beside the lead one: on phones it takes the whole row. */
  alone: boolean;
}) {
  return (
    <Link
      href={taskHref(task.projectId, task.id, "hoy")}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
      className={`group animate-rise relative flex min-w-0 flex-col gap-3 rounded-panel border border-line bg-raised p-4 shadow-panel transition-[translate,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_12px_28px_-16px_rgba(26,35,50,0.35)] md:col-span-2 md:p-5 ${alone ? "col-span-full" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2 text-meta">
        <span className="tabular shrink-0 font-semibold text-accent">
          {String(rank).padStart(2, "0")}
        </span>
        <span aria-hidden="true" className="h-3 w-px shrink-0 bg-line-strong" />
        <span className="min-w-0 flex-1 truncate text-muted">
          {task.projectName}
        </span>
        {task.pinnedToday && (
          <PinIcon filled className="size-3.5 text-accent" />
        )}
        <ArrowRightIcon className="size-3.5 -translate-x-1 text-accent opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 max-md:hidden" />
      </div>

      <p className="line-clamp-3 font-medium text-ink md:line-clamp-2 md:text-[15px] md:leading-[22px]">
        {task.title}
      </p>

      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        {task.dueDate && (
          <DueChip
            dueDate={task.dueDate.toISOString()}
            serverNow={serverNow}
            variant="card"
          />
        )}
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
          <StatusDot status={task.status} className="size-1.5" />
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      <div className="mt-auto flex items-center gap-2.5 pt-1">
        <div
          role="progressbar"
          aria-label={`Avance de ${task.title}`}
          aria-valuenow={task.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1 flex-1 overflow-hidden rounded-full bg-sunken dark:bg-line"
        >
          <div
            className="animate-bar-grow h-full rounded-full"
            style={
              {
                width: `${task.progressPct}%`,
                backgroundColor: STATUS_TONE[task.status],
                "--delay": `${delay + 200}ms`,
              } as CSSProperties
            }
          />
        </div>
        <span className="tabular shrink-0 text-[12px] font-medium text-muted">
          {task.progressPct}%
        </span>
      </div>
    </Link>
  );
}
