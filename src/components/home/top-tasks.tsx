import Link from "next/link";
import type { CSSProperties } from "react";
import { STATUS_LABELS } from "@/components/project-types";
import { ArrowRightIcon, PinIcon } from "@/components/ui/icons";
import { STATUS_TONE, StatusBadge } from "@/components/ui/status-badge";
import { taskHref } from "@/lib/back-navigation";
import type { OverviewTask } from "@/lib/data/overview";
import { formatDueDate } from "@/lib/format";

const RING_SIZE = 64;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * The day's top tasks. The first one leads as a solid cobalt card; on desktop
 * it takes the left of a bento grid with the rest stacked beside it, on phones
 * it sits on top of a two-column row.
 */
export function TopTasks({ tasks }: { tasks: OverviewTask[] }) {
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
        <HeroTile task={hero} className={`col-span-full ${heroSpan}`} />
        {rest.map((task, i) => (
          <SecondaryTile
            key={task.id}
            task={task}
            rank={i + 2}
            delay={(i + 1) * 70}
            alone={rest.length === 1}
          />
        ))}
      </div>
    </section>
  );
}

function HeroTile({
  task,
  className,
}: {
  task: OverviewTask;
  className: string;
}) {
  const started = task.progressPct > 0;

  return (
    <Link
      href={taskHref(task.projectId, task.id, "hoy")}
      className={`group animate-rise relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-panel bg-linear-to-br from-spotlight-from to-spotlight-to p-5 text-spotlight-ink shadow-spotlight transition-transform duration-200 hover:-translate-y-0.5 md:p-6 ${className}`}
    >
      {/* A fine dot grid fading out from the top-right corner. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] bg-size-[14px_14px] mask-[radial-gradient(circle_at_100%_0%,black,transparent_65%)]"
      />

      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium leading-4">
          {task.pinnedToday && <PinIcon filled className="size-3.5" />}
          {task.pinnedToday ? "Fijada para hoy" : "Empieza por aquí"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium leading-4 text-white/80">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-white" />
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <p className="line-clamp-3 text-[22px] font-semibold leading-[28px] tracking-[-0.02em] md:text-[26px] md:leading-[32px]">
          {task.title}
        </p>
        {task.description?.trim() && (
          <p className="line-clamp-2 text-white/70">{task.description}</p>
        )}
      </div>

      <div className="mt-auto flex items-end justify-between gap-4 pt-2">
        <div className="flex min-w-0 flex-col gap-3">
          <TaskMeta task={task} className="text-white/70" />
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-meta font-semibold text-spotlight-to transition-colors group-hover:bg-white/90">
            {started ? "Continuar" : "Empezar"}
            <ArrowRightIcon className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
        <ProgressRing task={task} />
      </div>
    </Link>
  );
}

function SecondaryTile({
  task,
  rank,
  delay,
  alone,
}: {
  task: OverviewTask;
  rank: number;
  delay: number;
  /** The only card beside the lead one: on phones it takes the whole row. */
  alone: boolean;
}) {
  return (
    <Link
      href={taskHref(task.projectId, task.id, "hoy")}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
      className={`group animate-rise flex min-w-0 flex-col gap-3 rounded-panel border border-line bg-raised p-4 shadow-panel transition duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_10px_24px_-14px_rgba(26,35,50,0.35)] md:col-span-2 md:p-5 ${alone ? "col-span-full" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="tabular text-[26px] font-medium leading-none tracking-[-0.03em] text-muted/40 transition-colors group-hover:text-accent md:text-[30px]">
          {String(rank).padStart(2, "0")}
        </span>
        <span className="flex items-center gap-2">
          {task.pinnedToday && (
            <PinIcon filled className="size-3.5 text-accent" />
          )}
          <span className="max-sm:hidden">
            <StatusBadge status={task.status} />
          </span>
        </span>
      </div>
      <p className="line-clamp-3 font-medium text-ink md:line-clamp-2 md:text-[15px] md:leading-[22px]">
        {task.title}
      </p>
      <div className="mt-auto flex flex-col gap-2.5">
        <TaskMeta task={task} className="text-muted" stackOnPhones={!alone} />
        <ProgressBar task={task} delay={delay} />
      </div>
    </Link>
  );
}

function TaskMeta({
  task,
  className,
  stackOnPhones = false,
}: {
  task: OverviewTask;
  className: string;
  /** Narrow two-column cards put the due date on its own line on phones. */
  stackOnPhones?: boolean;
}) {
  return (
    <p
      className={`flex min-w-0 flex-wrap items-center gap-x-1.5 text-meta ${className}`}
    >
      <span className="truncate">{task.projectName}</span>
      {task.dueDate && (
        <>
          <span
            aria-hidden="true"
            className={stackOnPhones ? "max-sm:hidden" : ""}
          >
            ·
          </span>
          <span
            className={`tabular shrink-0 ${stackOnPhones ? "max-sm:basis-full" : ""}`}
          >
            vence {formatDueDate(task.dueDate)}
          </span>
        </>
      )}
    </p>
  );
}

function ProgressRing({ task }: { task: OverviewTask }) {
  const offset = RING_LENGTH * (1 - task.progressPct / 100);

  return (
    <div
      role="progressbar"
      aria-label={`Avance de ${task.title}`}
      aria-valuenow={task.progressPct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative shrink-0"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <svg
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={RING_STROKE}
        />
        {task.progressPct > 0 && (
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="white"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={offset}
            className="animate-ring-draw"
            style={{ "--ring-length": RING_LENGTH } as CSSProperties}
          />
        )}
      </svg>
      <span className="tabular absolute inset-0 flex items-center justify-center text-[15px] font-semibold">
        {task.progressPct}
        <span className="text-[10px] text-white/70">%</span>
      </span>
    </div>
  );
}

function ProgressBar({ task, delay }: { task: OverviewTask; delay: number }) {
  return (
    <div className="flex items-center gap-2.5">
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
      <span className="tabular shrink-0 text-meta font-medium text-muted">
        {task.progressPct}%
      </span>
    </div>
  );
}
