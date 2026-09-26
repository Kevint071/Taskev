import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRightIcon, PinIcon } from "@/components/ui/icons";
import { taskHref } from "@/lib/back-navigation";
import type { OverviewTask } from "@/lib/data/overview";
import { DueLabel } from "./due-label";

/**
 * The day's top tasks as the ranked stack the landing animation promises:
 * numbered rows, the first one marked in accent with its progress ring.
 */
export function TopTasks({
  tasks,
  serverNow,
}: {
  tasks: OverviewTask[];
  serverNow: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
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
      <ol className="flex min-w-0 flex-col gap-2">
        {tasks.map((task, i) => (
          <li
            key={task.id}
            className="animate-rise"
            style={{ "--delay": `${i * 70}ms` } as CSSProperties}
          >
            <TaskStackRow task={task} rank={i + 1} serverNow={serverNow} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function TaskStackRow({
  task,
  rank,
  serverNow,
}: {
  task: OverviewTask;
  rank: number;
  serverNow: string;
}) {
  const lead = rank === 1;

  return (
    <Link
      href={taskHref(task.projectId, task.id, "hoy")}
      className={`group flex min-w-0 items-center gap-3 rounded-panel border px-3.5 py-3 transition-[border-color,background-color,box-shadow] duration-200 ${
        lead
          ? "border-accent/60 bg-accent-soft shadow-[0_14px_32px_-18px_color-mix(in_srgb,var(--accent)_55%,transparent)] hover:border-accent"
          : "border-accent/30 bg-raised hover:border-accent/60"
      }`}
    >
      <span
        className={`tabular flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
          lead ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent"
        }`}
      >
        {rank}
      </span>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-semibold md:truncate">{task.title}</p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] leading-4 text-muted">
          {task.pinnedToday && (
            <PinIcon filled className="size-3 text-accent" />
          )}
          <span className="truncate">{task.projectName}</span>
          {task.dueDate && (
            <>
              <span aria-hidden="true">·</span>
              <DueLabel
                dueDate={task.dueDate.toISOString()}
                serverNow={serverNow}
              />
            </>
          )}
        </p>
      </div>

      {lead ? (
        <LeadRing task={task} />
      ) : (
        <span className="tabular shrink-0 text-meta text-muted">
          {task.progressPct}%
        </span>
      )}
    </Link>
  );
}

/** The landing's progress ring: accent over the track, the value inside. */
function LeadRing({ task }: { task: OverviewTask }) {
  return (
    <span
      role="progressbar"
      aria-label={`Avance de ${task.title}`}
      aria-valuenow={task.progressPct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="flex size-9 shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(var(--accent) ${task.progressPct}%, var(--line-strong) 0)`,
      }}
    >
      <span className="tabular flex size-7 items-center justify-center rounded-full bg-raised text-[11px] font-semibold">
        {task.progressPct}
      </span>
    </span>
  );
}
