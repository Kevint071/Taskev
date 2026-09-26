import Link from "next/link";
import { STATUS_TONE, StatusBadge } from "@/components/ui/status-badge";
import { taskHref } from "@/lib/back-navigation";
import type { OverviewTask } from "@/lib/data/overview";
import { formatDueDate } from "@/lib/format";

/**
 * The day's top tasks. The first one leads; on desktop it takes the left of a
 * bento grid with the rest stacked beside it, on phones everything stacks.
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
    <section className="flex min-w-0 flex-col gap-2">
      <h2 className="font-semibold">
        {tasks.length > 1 ? "Prioridades de hoy" : "Siguiente tarea"}
      </h2>
      <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 md:grid-cols-5">
        <HeroTile task={hero} className={`sm:col-span-full ${heroSpan}`} />
        {rest.map((task, i) => (
          <SecondaryTile key={task.id} task={task} rank={i + 2} />
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
  return (
    <Link
      href={taskHref(task.projectId, task.id, "hoy")}
      className={`flex min-w-0 flex-col gap-3 rounded-panel border border-accent/20 bg-accent-soft p-5 transition-colors hover:border-accent/40 md:p-6 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-meta font-medium text-accent">
          <Rank value={1} lead />
          Empieza por aquí
        </span>
        <StatusBadge status={task.status} />
      </div>
      <p className="line-clamp-3 text-section font-semibold text-ink">
        {task.title}
      </p>
      {task.description?.trim() && (
        <p className="line-clamp-2 text-muted">{task.description}</p>
      )}
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <TaskMeta task={task} />
        <Progress task={task} track="bg-accent/15" />
      </div>
    </Link>
  );
}

function SecondaryTile({ task, rank }: { task: OverviewTask; rank: number }) {
  return (
    <Link
      href={taskHref(task.projectId, task.id, "hoy")}
      className="flex min-w-0 flex-col gap-2 rounded-panel border border-line bg-raised p-4 shadow-panel transition-colors hover:border-line-strong md:col-span-2"
    >
      <div className="flex items-center justify-between gap-3">
        <Rank value={rank} />
        <StatusBadge status={task.status} />
      </div>
      <p className="line-clamp-2 font-medium text-ink">{task.title}</p>
      <TaskMeta task={task} />
      <Progress task={task} track="bg-line" className="mt-auto pt-1" />
    </Link>
  );
}

function Rank({ value, lead = false }: { value: number; lead?: boolean }) {
  return (
    <span
      className={`tabular flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
        lead ? "bg-accent text-accent-ink" : "bg-sunken text-muted"
      }`}
    >
      {value}
    </span>
  );
}

function TaskMeta({ task }: { task: OverviewTask }) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-meta text-muted">
      <span className="truncate">{task.projectName}</span>
      {task.dueDate && (
        <>
          <span aria-hidden="true">·</span>
          <span className="tabular shrink-0">
            vence {formatDueDate(task.dueDate)}
          </span>
        </>
      )}
    </p>
  );
}

function Progress({
  task,
  track,
  className,
}: {
  task: OverviewTask;
  track: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <div
        role="progressbar"
        aria-label={`Avance de ${task.title}`}
        aria-valuenow={task.progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`h-1.5 flex-1 overflow-hidden rounded-full ${track}`}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${task.progressPct}%`,
            backgroundColor: STATUS_TONE[task.status],
          }}
        />
      </div>
      <span className="tabular w-9 shrink-0 text-right text-meta font-medium text-muted">
        {task.progressPct}%
      </span>
    </div>
  );
}
