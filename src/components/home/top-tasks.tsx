import Link from "next/link";
import type { CSSProperties } from "react";
import { STATUS_LABELS } from "@/components/group-types";
import { ChevronRightIcon } from "@/components/ui/icons";
import { STATUS_DOT, STATUS_TONE } from "@/components/ui/status-badge";
import { taskHref } from "@/lib/back-navigation";
import type { OverviewTask } from "@/lib/data/overview";
import { PrioritySlider } from "./priority-slider";
import { DueChip, PriorityChip, ProgressDial, StatusChip } from "./task-chips";

const STEP_MS = 140;

// Phone card reveal: these classes only apply while the card is the active one, so each
// time it becomes active its band and attributes play in again (see `PrioritySlider`).
const REVEAL = "group-aria-[current=true]/slide:animate-attr-in";
const SWEEP = "group-aria-[current=true]/slide:animate-band-sweep";
const at = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

/**
 * The day's top tasks with everything that matters about each: status,
 * priority, due date and progress. From `lg` they are compact rows in a single
 * panel (rank, title and a line of chips on the left, a progress ring on the
 * right); on a phone they are cards in a reel that shows one at a time (see
 * `PrioritySlider`). Rows and cards rise in one after another while their
 * stripe, rank and progress fill in; the first rank pings.
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

      <PrioritySlider label="Prioridades de hoy">
        {tasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            rank={i + 1}
            serverNow={serverNow}
            delay={i * STEP_MS}
          />
        ))}
      </PrioritySlider>
    </section>
  );
}

/**
 * Two layouts of the same task. Phone: a fixed-height card in three rows (rank
 * and group with the status chip, the title with two lines always reserved,
 * then priority and due date with the progress ring), so all cards in the reel
 * are the same height whatever their content. `lg`: a compact row (rank circle,
 * title and chips line, ring), which the wrappers below switch to.
 */
function TaskCard({
  task,
  rank,
  serverNow,
  delay,
}: {
  task: OverviewTask;
  rank: number;
  serverNow: string;
  delay: number;
}) {
  const tone = STATUS_TONE[task.status];
  const first = rank === 1;

  return (
    <Link
      href={taskHref(task.groupId, task.id, "hoy")}
      style={{ "--tone": tone, "--delay": `${delay}ms` } as CSSProperties}
      className={`animate-rise group/card relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-raised shadow-panel transition-[translate,scale,box-shadow,border-color,background-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tone)_55%,var(--line))] hover:shadow-[0_14px_30px_-16px_color-mix(in_srgb,var(--ink)_55%,transparent)] active:scale-[0.99] lg:flex-none lg:rounded-none lg:border-0 lg:shadow-none lg:hover:translate-y-0 lg:hover:bg-sunken lg:hover:shadow-none lg:active:scale-100 ${
        first ? "border-accent/35 lg:bg-accent/5" : "border-line"
      }`}
    >
      {/* Row layout: the status color as a stripe that draws itself down the
          left edge (the phone card has its status band instead). */}
      <span
        aria-hidden="true"
        className="animate-grow-y absolute inset-y-3 left-0 hidden w-1 rounded-r-full bg-(--tone) lg:block"
        style={{ "--delay": `${delay + 200}ms` } as CSSProperties}
      />
      <span className="sr-only">Prioridad {rank}.</span>

      {/* Phone card */}
      <div className="flex flex-1 flex-col lg:hidden">
        {/* The status is the card's header band, tinted with its color: it
            sweeps in from the left and the label settles over it. */}
        <div className="relative flex items-center justify-between gap-3 px-4 py-2.5">
          <span
            aria-hidden="true"
            className={`absolute inset-0 bg-[color-mix(in_srgb,var(--tone)_16%,transparent)] ${SWEEP}`}
            style={at(0)}
          />
          <span
            className={`relative flex items-center gap-2 text-meta font-semibold ${REVEAL}`}
            style={at(160)}
          >
            <span
              aria-hidden="true"
              className={`relative size-2 rounded-full ${STATUS_DOT[task.status]}`}
            >
              {task.status === "en_curso" && (
                <span className="animate-node-ping absolute inset-0 rounded-full bg-(--tone)" />
              )}
            </span>
            {STATUS_LABELS[task.status]}
          </span>
          <span
            aria-hidden="true"
            className={`tabular relative text-meta font-semibold ${first ? "text-accent" : "text-muted"} ${REVEAL}`}
            style={at(220)}
          >
            #{rank}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <p
            className={`min-w-0 truncate text-meta text-muted ${REVEAL}`}
            style={at(300)}
          >
            {task.groupName}
          </p>

          <p
            className={`line-clamp-2 min-h-13 wrap-break-word text-body font-semibold ${REVEAL}`}
            style={at(380)}
          >
            {task.title}
          </p>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={REVEAL} style={at(480)}>
                <PriorityChip priority={task.priority} plain />
              </span>
              <span className={REVEAL} style={at(560)}>
                <DueChip dueDate={task.dueDate} serverNow={serverNow} />
              </span>
            </div>
            <span className={REVEAL} style={at(620)}>
              <ProgressDial
                pct={task.progressPct}
                tone={tone}
                delay={700}
                sweepClass="group-aria-[current=true]/slide:animate-ring-fill"
              />
            </span>
          </div>
        </div>
      </div>

      {/* Row from `lg` */}
      <div className="hidden grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3.5 lg:grid">
        <span
          aria-hidden="true"
          className={`animate-node-pop tabular relative col-start-1 row-span-2 row-start-1 flex size-8 shrink-0 items-center justify-center rounded-full text-ui font-semibold transition-colors ${
            first
              ? "bg-accent text-accent-ink ring-4 ring-accent/15"
              : "border border-line-strong bg-surface text-muted group-hover/card:border-accent group-hover/card:text-accent"
          }`}
          style={{ "--delay": `${delay + 120}ms` } as CSSProperties}
        >
          {first && (
            <span
              className="animate-node-ping absolute inset-0 rounded-full bg-accent"
              style={{ "--delay": `${STEP_MS * 3}ms` } as CSSProperties}
            />
          )}
          <span className="relative">{rank}</span>
        </span>

        <p className="col-start-2 row-start-1 min-w-0 truncate text-[0.9375rem] font-semibold leading-6">
          {task.title}
        </p>

        <div className="col-start-2 row-start-2 flex min-w-0 flex-wrap items-center gap-2">
          <p className="max-w-44 truncate pr-1 text-meta text-muted">
            {task.groupName}
          </p>
          <StatusChip status={task.status} plain />
          <PriorityChip priority={task.priority} plain />
          <DueChip dueDate={task.dueDate} serverNow={serverNow} plain />
        </div>

        <div className="col-start-3 row-span-2 row-start-1 flex items-center gap-3">
          <ProgressDial
            pct={task.progressPct}
            tone={tone}
            delay={delay + 320}
          />
          <ChevronRightIcon className="size-4 shrink-0 text-muted transition-transform duration-300 group-hover/card:translate-x-1 group-hover/card:text-accent" />
        </div>
      </div>
    </Link>
  );
}
