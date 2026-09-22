import Link from "next/link";
import { type GlobalTask, STATUS_LABELS } from "@/components/project-types";
import { ProgressRing } from "@/components/task-section";
import { CalendarIcon, FlagIcon } from "@/components/ui/icons";
import { STATUS_TONE, StatusDot } from "@/components/ui/status-badge";
import { type BackSource, taskHref } from "@/lib/back-navigation";
import { daysBetweenUtc, todayUtcMidnight } from "@/lib/calendar";
import { formatDueRelative, formatPriority } from "@/lib/format";

const DUE_CHIP_TONE = {
  danger: "bg-danger/10 text-danger",
  accent: "bg-accent-soft text-accent",
  muted: "bg-sunken text-muted",
} as const;

const CHIP =
  "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-meta font-medium tabular lg:justify-self-start";

/**
 * One task. Below `lg` it is a card: title, a status/project line and a row of
 * chips, with the progress ring on the right. From `lg` the chips wrapper
 * dissolves (`contents`) so priority, due date and ring become aligned grid
 * columns and each task fits on a single line.
 *
 * The whole row is clickable through the title link's stretched `::after`.
 */
export function TaskRow({
  task,
  now,
  from,
}: {
  task: GlobalTask;
  now: Date;
  from?: BackSource;
}) {
  const done = task.status === "completada";
  const days = task.dueDate
    ? daysBetweenUtc(new Date(task.dueDate), todayUtcMidnight(now))
    : null;
  const dueTone = done
    ? "muted"
    : days !== null && days < 0
      ? "danger"
      : days === 0
        ? "accent"
        : "muted";
  const priority = Number(task.priority);
  const hasPriority = priority > 0;
  const hasChips = hasPriority || task.dueDate !== null;

  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-3 pr-4 pl-3.5 transition-colors first:rounded-t-panel last:rounded-b-panel hover:bg-sunken lg:grid-cols-[minmax(0,1fr)_3.75rem_7rem_2rem] lg:gap-x-3">
      <span
        aria-hidden="true"
        className="absolute inset-y-2 left-0 w-[3px] rounded-full"
        style={{ backgroundColor: STATUS_TONE[task.status] }}
      />

      <div className="col-start-1 row-start-1 min-w-0 lg:col-auto lg:row-auto">
        <Link
          href={taskHref(task.projectId, task.id, from)}
          title={task.title}
          className="block after:absolute after:inset-0"
        >
          <span
            className={`line-clamp-2 break-words text-body font-medium lg:text-ui ${
              done ? "text-muted line-through decoration-line-strong" : ""
            }`}
          >
            {task.title}
          </span>
        </Link>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-meta text-muted">
          <StatusDot status={task.status} />
          <span className="shrink-0">{STATUS_LABELS[task.status]}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{task.projectName}</span>
        </p>
      </div>

      <div
        className={`${hasChips ? "flex" : "hidden"} col-start-1 row-start-2 mt-2 flex-wrap gap-2 lg:contents`}
      >
        {hasPriority ? (
          <span
            title={`Prioridad ${formatPriority(priority)}`}
            className={`${CHIP} bg-sunken text-muted`}
          >
            <FlagIcon className="size-3.5" />
            {formatPriority(priority)}
          </span>
        ) : (
          <span aria-hidden="true" className="hidden lg:block" />
        )}
        {task.dueDate ? (
          <span className={`${CHIP} ${DUE_CHIP_TONE[dueTone]}`}>
            <CalendarIcon className="size-3.5" />
            {formatDueRelative(task.dueDate, now)}
          </span>
        ) : (
          <span aria-hidden="true" className="hidden lg:block" />
        )}
      </div>

      <div className="col-start-2 row-span-2 row-start-1 lg:col-auto lg:row-auto">
        <ProgressRing
          pct={task.progressPct}
          color={STATUS_TONE[task.status]}
          size="md"
        />
      </div>
    </li>
  );
}
