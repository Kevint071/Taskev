import Link from "next/link";
import { useState } from "react";
import { STATUS_LABELS, type Task } from "@/components/project-types";
import { ProgressRing } from "@/components/task-section";
import { CalendarPanel } from "@/components/ui/calendar-panel";
import { CalendarIcon, CheckIcon, FlagIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/input";
import { Popover } from "@/components/ui/popover";
import { STATUS_DOT, STATUS_TONE } from "@/components/ui/status-badge";
import { type BackSource, taskHref } from "@/lib/back-navigation";
import { daysBetweenUtc, todayUtcMidnight } from "@/lib/calendar";
import { formatDueRelative, formatPriority } from "@/lib/format";
import { blockedFromDisponible, canCompleteAtProgress } from "@/lib/progress";
import { isTempId } from "@/lib/sync-queue";

const DUE_CHIP_TONE = {
  danger: "text-danger",
  accent: "text-accent",
  muted: "text-muted",
} as const;

// `first:-ml-2` cancels the chip's own left padding when it's the line's
// first element (e.g. the project page hides the project name), so its
// icon lines up flush with the title above instead of sitting ~8px in.
const CHIP =
  "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-meta font-medium tabular first:-ml-2";

export type TaskRowTask = Task & { projectName?: string };

export type TaskStatusChange = {
  status: Task["status"];
  completedAt: string | null;
};

/**
 * One task: title, then a project/due-date/priority line, on the left,
 * with the priority flag always last (rightmost). `showProgress` also
 * renders a small progress ring in the top-right corner of the row.
 *
 * The whole row is clickable through the title link's stretched `::after`.
 *
 * Passing `onStatusChange` adds an inline status control on the project detail
 * page; the global task list omits it and stays read-only.
 */
export function TaskRow({
  task,
  now,
  from,
  showProgress = true,
  showProject = true,
  centerProgressOnDesktop = false,
  inlineProjectStatus = false,
  onStatusChange,
  onBlocked,
}: {
  task: TaskRowTask;
  now: Date;
  from?: BackSource;
  showProgress?: boolean;
  /** Vertically centers the progress ring at desktop widths. */
  centerProgressOnDesktop?: boolean;
  /** Shows the editable status as an unframed metadata control. */
  inlineProjectStatus?: boolean;
  /** Hides the project-name meta text, e.g. inside that project's own page. */
  showProject?: boolean;
  onStatusChange?: (change: TaskStatusChange) => void;
  onBlocked?: (message: string) => void;
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
  const editable = Boolean(onStatusChange);
  const creating = isTempId(task.id);

  const [completePromptOpen, setCompletePromptOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  function handleStatusSelect(next: Task["status"]) {
    if (!onStatusChange) return;
    if (next === "completada") {
      if (!canCompleteAtProgress(task.progressPct)) {
        onBlocked?.("Sube el avance al 100% para poder completar la tarea.");
        return;
      }
      setCompletePromptOpen(true);
      return;
    }
    if (next === "disponible") {
      const blocked = blockedFromDisponible(task.progressPct, task.completedAt);
      if (blocked === "progress") {
        onBlocked?.("Baja el avance a 0% antes de pasarla a disponible.");
        return;
      }
      if (blocked === "completedAt") {
        onBlocked?.(
          "Esta tarea todavía tiene fecha de finalización. Cambia antes a otro estado.",
        );
        return;
      }
    }
    onStatusChange({ status: next, completedAt: null });
  }

  function confirmComplete(date: Date) {
    setCompletePromptOpen(false);
    onStatusChange?.({ status: "completada", completedAt: date.toISOString() });
  }

  function renderStatusControl(inline: boolean) {
    return (
      <Popover
        open={completePromptOpen || (inline && statusMenuOpen)}
        onClose={() => {
          setCompletePromptOpen(false);
          setStatusMenuOpen(false);
        }}
        className={inline && statusMenuOpen ? "z-50" : inline ? "z-30" : "z-10"}
      >
        {inline && statusMenuOpen && (
          <button
            type="button"
            aria-label="Cerrar menú de estados"
            tabIndex={-1}
            onClick={() => setStatusMenuOpen(false)}
            className="fixed inset-0 z-0 cursor-default bg-transparent"
          />
        )}
        {inline ? (
          <div className="relative z-10">
            <button
              type="button"
              aria-label={`Estado: ${STATUS_LABELS[task.status]}`}
              aria-haspopup="true"
              aria-expanded={statusMenuOpen}
              onClick={() => setStatusMenuOpen((open) => !open)}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm text-meta font-medium text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {STATUS_LABELS[task.status]}
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5.5 8l4.5 4.5L14.5 8" />
              </svg>
            </button>
            {statusMenuOpen && (
              <fieldset
                className="pointer-events-auto absolute left-0 top-full z-50 m-0 mt-1.5 flex min-w-40 flex-col gap-0.5 rounded-control border border-line-strong bg-raised p-1 shadow-lg"
                style={{ backgroundColor: "var(--raised)" }}
              >
                <legend className="sr-only">Cambiar estado</legend>
                {(Object.keys(STATUS_LABELS) as Task["status"][]).map(
                  (status) => {
                    const current = task.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={current}
                        onClick={() => {
                          setStatusMenuOpen(false);
                          handleStatusSelect(status);
                        }}
                        className={`flex min-h-9 w-full items-center gap-2 rounded-control px-2.5 text-left text-meta transition-colors ${
                          current
                            ? "bg-sunken font-semibold text-ink"
                            : "text-ink hover:bg-sunken"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[status]}`}
                        />
                        <span className="min-w-0 flex-1">
                          {STATUS_LABELS[status]}
                        </span>
                        {current && (
                          <CheckIcon className="size-4 text-accent" />
                        )}
                      </button>
                    );
                  },
                )}
              </fieldset>
            )}
          </div>
        ) : (
          // biome-ignore lint/a11y/noLabelWithoutControl: wraps the Select component
          <label className="relative z-10 hidden shrink-0 items-center sm:flex">
            <span className="sr-only">Estado</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute left-2.5 size-2 rounded-full ${STATUS_DOT[task.status]}`}
            />
            <Select
              value={task.status}
              onChange={(e) =>
                handleStatusSelect(e.target.value as Task["status"])
              }
              className="h-8 w-auto min-w-0 border-transparent bg-transparent pr-5 pl-6 text-meta sm:w-32 sm:min-w-[6.5rem] sm:border-line-strong sm:bg-raised sm:pr-7"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="pointer-events-none absolute right-2 size-3 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5.5 8l4.5 4.5L14.5 8" />
            </svg>
          </label>
        )}
        {completePromptOpen && (
          <div className="absolute right-0 top-full z-20 mt-1.5">
            <p className="mb-1.5 px-1 text-meta font-medium text-muted">
              Fecha de finalización
            </p>
            <CalendarPanel
              selected={todayUtcMidnight()}
              shortcuts={[
                { key: "today", label: "Hoy", date: todayUtcMidnight() },
              ]}
              onSelect={confirmComplete}
            />
          </div>
        )}
      </Popover>
    );
  }

  const titleEl = (
    <span
      className={`block truncate text-body font-medium lg:text-ui ${
        done
          ? `text-muted ${inlineProjectStatus ? "" : "line-through decoration-line-strong"}`
          : ""
      }`}
    >
      {task.title}
    </span>
  );

  return (
    <li
      className={`relative flex items-center gap-x-2 py-3 pr-4 pl-3.5 transition-colors first:rounded-t-panel last:rounded-b-panel lg:gap-x-3 ${creating ? "" : "hover:bg-sunken"}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-2 left-0 w-[3px] rounded-full"
        style={{ backgroundColor: STATUS_TONE[task.status] }}
      />

      <div className="min-w-0 flex-1 self-start">
        {creating ? (
          // A task still being created has no server id to navigate to yet.
          titleEl
        ) : (
          <Link
            href={taskHref(task.projectId, task.id, from)}
            title={task.title}
            className="block after:absolute after:inset-0"
          >
            {titleEl}
          </Link>
        )}
        <div
          className={`mt-0.5 flex min-w-0 items-center gap-1.5 text-meta text-muted ${
            inlineProjectStatus ? "flex-wrap gap-y-1" : ""
          }`}
        >
          {showProject && task.projectName ? (
            <span className="truncate">{task.projectName}</span>
          ) : null}
          {creating ? (
            <span
              title="Guardando"
              className="animate-syncing size-1.5 shrink-0 rounded-full bg-accent"
            >
              <span className="sr-only">Guardando</span>
            </span>
          ) : null}
          {editable && inlineProjectStatus ? renderStatusControl(true) : null}
          {task.dueDate ? (
            <span className={`${CHIP} shrink-0 ${DUE_CHIP_TONE[dueTone]}`}>
              <CalendarIcon className="size-3.5" />
              {formatDueRelative(task.dueDate, now)}
            </span>
          ) : null}
          {hasPriority ? (
            <span
              title={`Prioridad ${formatPriority(priority)}`}
              className={`${CHIP} ${task.dueDate ? "-ml-2" : ""} shrink-0 text-muted`}
            >
              <FlagIcon className="size-3.5" />
              {formatPriority(priority)}
            </span>
          ) : null}
        </div>
      </div>

      {showProgress ? (
        <span
          className={
            centerProgressOnDesktop ? "self-start lg:self-center" : "self-start"
          }
        >
          <ProgressRing
            pct={task.progressPct}
            color={STATUS_TONE[task.status]}
          />
        </span>
      ) : null}

      {editable && !inlineProjectStatus && (
        <>
          <span
            title={STATUS_LABELS[task.status]}
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[task.status]} sm:hidden`}
          />
          {renderStatusControl(false)}
        </>
      )}
    </li>
  );
}
