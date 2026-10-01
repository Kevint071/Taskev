import Link from "next/link";
import { useState } from "react";
import { STATUS_LABELS, type Task } from "@/components/group-types";
import { ProgressRing } from "@/components/task-section";
import { CalendarPanel } from "@/components/ui/calendar-panel";
import { CalendarIcon, FlagIcon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";
import { STATUS_TONE, StatusIcon } from "@/components/ui/status-badge";
import { type BackSource, taskHref } from "@/lib/back-navigation";
import { daysBetweenUtc, todayUtcMidnight } from "@/lib/calendar";
import { formatDueRelative, formatPriority } from "@/lib/format";
import { isTempId } from "@/lib/sync-queue";
import { type StatusChange, StatusMenu } from "./status-menu";

const DUE_CHIP_TONE = {
  danger: "text-danger",
  accent: "text-accent",
  muted: "text-muted",
} as const;

// `first:-ml-2` cancels the chip's own left padding when it's the line's
// first element (e.g. the group page hides the group name), so its
// icon lines up flush with the title above instead of sitting ~8px in.
const CHIP =
  "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-meta font-medium tabular first:-ml-2";

/**
 * The `<ul>` of rows rendered with `flatOnMobile`: below `lg` one bordered
 * panel (not clipped, since rows open menus; the first and last row round
 * their own corners), from `lg` a plain stack of cards.
 */
export const FLAT_TASK_LIST =
  "flex flex-col rounded-panel border border-line bg-raised shadow-panel dark:border-white/10 dark:bg-[#101217] lg:gap-2 lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none dark:lg:bg-transparent";

export type TaskRowTask = Task & { groupName?: string };

export type TaskStatusChange = StatusChange;

/**
 * One task: title, then a group/due-date/priority line, on the left,
 * with the priority flag always last (rightmost). `showProgress` also
 * renders a small progress ring in the top-right corner of the row.
 *
 * The whole row is clickable through the title link's stretched `::after`.
 *
 * Passing `onStatusChange` adds an inline status control on the group detail
 * page; the global task list omits it and stays read-only.
 */
export function TaskRow({
  task,
  now,
  from,
  showProgress = true,
  showGroup = true,
  centerProgressOnDesktop = false,
  inlineGroupStatus = false,
  flatOnMobile = false,
  onStatusChange,
  onBlocked,
}: {
  task: TaskRowTask;
  now: Date;
  from?: BackSource;
  showProgress?: boolean;
  /** Vertically centers the progress ring at desktop widths. */
  centerProgressOnDesktop?: boolean;
  /** Card layout (group page and global list): wrapping meta line, no strike-through when done. */
  inlineGroupStatus?: boolean;
  /**
   * Below `lg`, a row of a shared panel (the parent `<ul>` draws the border):
   * the due date moves to a right-hand column as plain text, the priority flag
   * sits beside the status, and a leading status icon (which also shows
   * progress) replaces the colour bar and the progress ring. From `lg` it
   * falls back to the card layout.
   */
  flatOnMobile?: boolean;
  /** Hides the group-name meta text, e.g. inside that group's own page. */
  showGroup?: boolean;
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

  function confirmComplete(date: Date) {
    setCompletePromptOpen(false);
    onStatusChange?.({ status: "completada", completedAt: date.toISOString() });
  }

  function renderStatusControl() {
    return (
      <Popover
        open={completePromptOpen}
        onClose={() => setCompletePromptOpen(false)}
        // At rest it only needs to clear the row link's overlay; open, it only
        // needs to clear the other rows. Either way it stays under the fixed
        // tab bar (z-10) so an open menu scrolls beneath it.
        className={statusMenuOpen || completePromptOpen ? "z-5" : "z-1"}
      >
        <StatusMenu
          status={task.status}
          progressPct={task.progressPct}
          completedAt={task.completedAt}
          onChange={(change) => onStatusChange?.(change)}
          onComplete={() => setCompletePromptOpen(true)}
          onBlocked={(message) => onBlocked?.(message)}
          onOpenChange={setStatusMenuOpen}
          trigger={({ open, toggle }) => (
            <button
              type="button"
              aria-label={`Estado: ${STATUS_LABELS[task.status]}`}
              aria-haspopup="true"
              aria-expanded={open}
              onClick={toggle}
              className="inline-flex min-h-6 items-center gap-1 whitespace-nowrap rounded-sm text-meta font-medium text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {STATUS_LABELS[task.status]}
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5.5 8l4.5 4.5L14.5 8" />
              </svg>
            </button>
          )}
        />
        {completePromptOpen && (
          <div className="absolute right-0 top-full z-20 mt-1.5">
            <p className="mb-1.5 px-1 text-meta font-medium text-muted">
              Fecha de finalización
            </p>
            <CalendarPanel
              focusOnMount
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
      className={`block truncate font-medium ${flatOnMobile ? "text-ui" : "text-body lg:text-ui"} ${
        done
          ? `text-muted ${inlineGroupStatus ? "" : "line-through decoration-line-strong"}`
          : ""
      }`}
    >
      {task.title}
    </span>
  );

  const dueText = task.dueDate ? formatDueRelative(task.dueDate, now) : null;
  const hideOnMobile = flatOnMobile ? "max-lg:hidden" : "";
  const rowShape = !inlineGroupStatus
    ? "py-3 first:rounded-t-panel last:rounded-b-panel"
    : flatOnMobile
      ? "py-3 max-lg:gap-x-3 max-lg:first:rounded-t-[9px] max-lg:last:rounded-b-[9px] not-last:border-b not-last:border-line lg:rounded-lg lg:border lg:border-line lg:bg-raised lg:py-3 lg:shadow-panel dark:not-last:border-white/10 dark:lg:border-white/10 dark:lg:bg-[#101217] dark:hover:bg-[#1b2028]"
      : "rounded-lg border border-line bg-raised py-2 shadow-panel lg:py-3 dark:border-white/10 dark:bg-[#101217] dark:hover:bg-[#1b2028]";

  return (
    <li
      className={`relative flex items-center gap-x-2 pr-4 pl-3.5 transition-colors lg:gap-x-3 ${rowShape} ${creating ? "" : "hover:bg-sunken"}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-2 left-0 w-0.75 rounded-full ${hideOnMobile}`}
        style={{ backgroundColor: STATUS_TONE[task.status] }}
      />

      {flatOnMobile ? (
        <StatusIcon
          status={task.status}
          progressPct={task.progressPct}
          className="size-4 self-center lg:hidden"
        />
      ) : null}

      <div className="min-w-0 flex-1 self-start">
        {creating ? (
          // A task still being created has no server id to navigate to yet.
          titleEl
        ) : (
          <Link
            href={taskHref(task.groupId, task.id, from)}
            title={task.title}
            className="block after:absolute after:inset-0"
          >
            {titleEl}
          </Link>
        )}
        <div
          className={`flex min-w-0 items-center gap-1.5 text-meta text-muted ${
            inlineGroupStatus
              ? `flex-wrap gap-y-0.5 lg:gap-y-1 lg:mt-0.5 ${flatOnMobile ? "max-lg:flex-nowrap" : ""}`
              : "mt-0.5"
          }`}
        >
          {showGroup && task.groupName ? (
            <span className="truncate">{task.groupName}</span>
          ) : null}
          {creating ? (
            <span
              title="Guardando"
              className="animate-syncing size-1.5 shrink-0 rounded-full bg-accent"
            >
              <span className="sr-only">Guardando</span>
            </span>
          ) : null}
          {editable ? renderStatusControl() : null}
          {dueText ? (
            <span
              className={`${CHIP} ${inlineGroupStatus ? "h-5 lg:h-6" : ""} ${hideOnMobile} shrink-0 ${DUE_CHIP_TONE[dueTone]}`}
            >
              <CalendarIcon className="size-3.5" />
              {dueText}
            </span>
          ) : null}
          {flatOnMobile && hasPriority ? (
            // Plain flag and number beside the status (or group name); the
            // chip below takes over from `lg`.
            <span className="ml-1.5 inline-flex shrink-0 items-center gap-0.5 font-medium tabular lg:hidden">
              <FlagIcon className="size-3.5" />
              <span className="sr-only">Prioridad</span>
              {formatPriority(priority)}
            </span>
          ) : null}
          {hasPriority ? (
            <span
              title={`Prioridad ${formatPriority(priority)}`}
              className={`${CHIP} ${inlineGroupStatus ? "h-5 lg:h-6" : ""} ${hideOnMobile} ${task.dueDate ? "-ml-2" : ""} shrink-0 text-muted`}
            >
              <FlagIcon className="size-3.5" />
              {/* The tooltip is only for the mouse; assistive tech reads this. */}
              <span className="sr-only">Prioridad</span>
              {formatPriority(priority)}
            </span>
          ) : null}
        </div>
      </div>

      {flatOnMobile && dueText ? (
        // Same line height as the title so the date sits on its baseline.
        <span
          className={`self-start whitespace-nowrap pl-2 text-meta leading-5 font-medium tabular lg:hidden ${DUE_CHIP_TONE[dueTone]}`}
        >
          {dueText}
        </span>
      ) : null}

      {showProgress ? (
        <span
          className={`${centerProgressOnDesktop ? "self-start lg:self-center" : "self-start"} ${hideOnMobile}`}
        >
          <ProgressRing
            pct={task.progressPct}
            color={STATUS_TONE[task.status]}
          />
        </span>
      ) : null}
    </li>
  );
}
