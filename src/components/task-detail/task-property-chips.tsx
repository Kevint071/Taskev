import { STATUS_LABELS, type Task } from "@/components/group-types";
import { type StatusChange, StatusMenu } from "@/components/tasks/status-menu";
import { CalendarIcon, CheckIcon, FlagIcon } from "@/components/ui/icons";
import { StatusDot } from "@/components/ui/status-badge";
import {
  formatDueDate,
  formatDueDateForTaskChip,
  formatPriority,
} from "@/lib/format";
import { progressEditBlock } from "@/lib/progress";
import { PropertyChip } from "./property-chip";
import type { SheetKey } from "./task-property-sheet";

/**
 * The pills under the title: status, due date, progress, priority and, once
 * done, when it finished. Each opens its own sheet (status opens a menu).
 */
export function TaskPropertyChips({
  status,
  progressPct,
  priority,
  dueDate,
  completedAt,
  overdue = false,
  onStatusChange,
  onRequestCompletion,
  onBlocked,
  onOpenSheet,
  onMarkComplete,
}: {
  status: Task["status"];
  progressPct: number;
  priority: number;
  dueDate: string | null;
  completedAt: string | null;
  overdue?: boolean;
  onStatusChange: (change: StatusChange) => void;
  onRequestCompletion: () => void;
  onBlocked: (message: string) => void;
  onOpenSheet: (sheet: SheetKey) => void;
  /** Offers a "Marcar completada" shortcut when provided. */
  onMarkComplete?: () => void;
}) {
  const done = status === "completada";

  return (
    <section
      aria-label="Detalles"
      className="flex flex-wrap items-center gap-2"
    >
      <div className="max-w-full rounded-full">
        <StatusMenu
          status={status}
          progressPct={progressPct}
          completedAt={completedAt}
          onChange={onStatusChange}
          onComplete={onRequestCompletion}
          onBlocked={onBlocked}
          trigger={({ open, toggle }) => (
            <PropertyChip
              label={`Estado: ${STATUS_LABELS[status]}`}
              icon={<StatusDot status={status} />}
              tone="var(--tone)"
              appearance="select"
              expanded={open}
              onClick={toggle}
            >
              {STATUS_LABELS[status]}
            </PropertyChip>
          )}
        />
      </div>

      <div className="max-w-full rounded-full">
        <PropertyChip
          label={
            dueDate
              ? `Fecha: ${formatDueDateForTaskChip(dueDate)}`
              : "Fecha: sin fecha"
          }
          icon={<CalendarIcon className="text-current" />}
          tone={overdue ? "var(--danger)" : undefined}
          appearance="quiet"
          onClick={() => onOpenSheet("due")}
        >
          {dueDate ? (
            <span className="truncate">
              {formatDueDateForTaskChip(dueDate)}
            </span>
          ) : (
            <span className="font-normal text-muted">Sin fecha</span>
          )}
        </PropertyChip>
      </div>

      <div className="max-w-full rounded-full">
        <PropertyChip
          label={`Avance: ${progressPct} %`}
          icon={
            <span
              aria-hidden="true"
              style={{
                background: `conic-gradient(var(--tone) ${progressPct}%, var(--line-strong) 0)`,
              }}
              className="flex size-4 shrink-0 items-center justify-center rounded-full"
            >
              <span className="size-2 rounded-full bg-raised" />
            </span>
          }
          appearance="quiet"
          onClick={() => {
            const blocked = progressEditBlock(status);
            if (blocked) onBlocked(blocked);
            else onOpenSheet("progress");
          }}
        >
          <span className="tabular">{progressPct} %</span>
        </PropertyChip>
      </div>

      <div className="max-w-full rounded-full">
        <PropertyChip
          label={`Prioridad: ${formatPriority(priority)}`}
          icon={<FlagIcon className="text-current" />}
          appearance="quiet"
          onClick={() => onOpenSheet("priority")}
        >
          <span className="tabular">{formatPriority(priority)}</span>
        </PropertyChip>
      </div>

      {onMarkComplete && (
        <button
          type="button"
          onClick={onMarkComplete}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-status-done px-3.5 text-ui font-semibold text-accent-ink transition-opacity hover:opacity-90"
        >
          <CheckIcon />
          Marcar completada
        </button>
      )}

      {done && completedAt && (
        <div className="max-w-full rounded-full">
          <PropertyChip
            label={`Finalizada el ${formatDueDate(completedAt)}`}
            icon={<CheckIcon className="text-current" />}
            appearance="quiet"
            onClick={() => onOpenSheet("completion")}
          >
            Finalizada el {formatDueDate(completedAt)}
          </PropertyChip>
        </div>
      )}
    </section>
  );
}
