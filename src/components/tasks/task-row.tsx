import Link from "next/link";
import { type GlobalTask } from "@/components/project-types";
import { CalendarIcon, FlagIcon } from "@/components/ui/icons";
import { STATUS_TONE } from "@/components/ui/status-badge";
import { type BackSource, taskHref } from "@/lib/back-navigation";
import { daysBetweenUtc, todayUtcMidnight } from "@/lib/calendar";
import { formatDueRelative, formatPriority } from "@/lib/format";

const DUE_CHIP_TONE = {
  danger: "text-danger",
  accent: "text-accent",
  muted: "text-muted",
} as const;

const CHIP =
  "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-meta font-medium tabular";

/**
 * One task: title, then a project/due-date line, on the left,
 * with the priority flag on the right. `showProgress` also renders a short
 * progress bar below the flag (used outside the global Tareas screen).
 *
 * The whole row is clickable through the title link's stretched `::after`.
 */
export function TaskRow({
  task,
  now,
  from,
  showProgress = true,
}: {
  task: GlobalTask;
  now: Date;
  from?: BackSource;
  showProgress?: boolean;
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

  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-3 pr-4 pl-3.5 transition-colors first:rounded-t-panel last:rounded-b-panel hover:bg-sunken lg:gap-x-3">
      <span
        aria-hidden="true"
        className="absolute inset-y-2 left-0 w-[3px] rounded-full"
        style={{ backgroundColor: STATUS_TONE[task.status] }}
      />

      <div className="col-start-1 row-start-1 min-w-0 self-start">
        <Link
          href={taskHref(task.projectId, task.id, from)}
          title={task.title}
          className="block after:absolute after:inset-0"
        >
          <span
            className={`block truncate text-body font-medium lg:text-ui ${
              done ? "text-muted line-through decoration-line-strong" : ""
            }`}
          >
            {task.title}
          </span>
        </Link>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-meta text-muted">
          <span className="truncate">{task.projectName}</span>
          {task.dueDate ? (
            <span className={`${CHIP} shrink-0 ${DUE_CHIP_TONE[dueTone]}`}>
              <CalendarIcon className="size-3.5" />
              {formatDueRelative(task.dueDate, now)}
            </span>
          ) : null}
        </p>
      </div>

      <div
        className={`col-start-2 row-start-1 flex h-full flex-col items-center gap-1 self-stretch ${
          showProgress
            ? hasPriority
              ? "justify-between"
              : "justify-end"
            : "justify-center"
        }`}
      >
        {hasPriority ? (
          <span
            title={`Prioridad ${formatPriority(priority)}`}
            className={`${CHIP} bg-sunken text-muted`}
          >
            <FlagIcon className="size-3.5" />
            {formatPriority(priority)}
          </span>
        ) : null}
        {showProgress ? (
          <span
            role="progressbar"
            aria-valuenow={task.progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-6 shrink-0 overflow-hidden rounded-full bg-line-strong"
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${task.progressPct}%`,
                backgroundColor: STATUS_TONE[task.status],
              }}
            />
          </span>
        ) : null}
      </div>
    </li>
  );
}
