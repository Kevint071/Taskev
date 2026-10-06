import type { CSSProperties } from "react";
import { STATUS_LABELS } from "@/components/group-types";
import { CalendarIcon, FlagIcon } from "@/components/ui/icons";
import { STATUS_DOT, STATUS_TONE } from "@/components/ui/status-badge";
import type { OverviewTask } from "@/lib/data/repositories/overview";
import { formatPriority } from "@/lib/format";
import { DueLabel } from "./due-label";

const CHIP =
  "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full text-meta font-medium";

/** The status as a chip tinted with its own color, so it reads before the text does. */
export function StatusChip({
  status,
  plain = false,
}: {
  status: OverviewTask["status"];
  /** No background or side padding: just the dot and label, flush with its neighbors. */
  plain?: boolean;
}) {
  return (
    <span
      className={`${CHIP} ${plain ? "" : "px-2.5"}`}
      style={
        {
          color: "var(--ink)",
          backgroundColor: plain
            ? undefined
            : `color-mix(in srgb, ${STATUS_TONE[status]} 16%, transparent)`,
        } as CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${STATUS_DOT[status]}`}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Priority as a flag and its number; a task with none shows 0, so the chip is always there. */
export function PriorityChip({
  priority,
  plain = false,
}: {
  priority: string;
  /** No background or side padding: just the flag and number, flush with its neighbors. */
  plain?: boolean;
}) {
  const value = Math.max(0, Number(priority));
  return (
    <span
      className={`${CHIP} tabular text-ink ${plain ? "" : "bg-sunken px-2.5"}`}
    >
      <FlagIcon className="size-3.5 text-muted" />
      <span className="sr-only">Prioridad</span>
      {formatPriority(value)}
    </span>
  );
}

/** "vence hoy" / "venció ayer" on a chip; the label keeps its own tone. */
export function DueChip({
  dueDate,
  serverNow,
  plain = false,
}: {
  dueDate: Date | null;
  serverNow: string;
  /** No background or side padding: just the calendar and label, flush with its neighbors. */
  plain?: boolean;
}) {
  if (!dueDate) return null;
  return (
    <span className={`${CHIP} ${plain ? "" : "bg-sunken px-2.5"}`}>
      <CalendarIcon className="size-3.5 text-muted" />
      <DueLabel dueDate={dueDate.toISOString()} serverNow={serverNow} />
    </span>
  );
}

/** A ring that sweeps to the percentage, with the number inside. */
export function ProgressDial({
  pct,
  tone,
  delay,
  sweepClass = "animate-ring-fill",
}: {
  pct: number;
  tone: string;
  delay: number;
  /** The class that plays the sweep; callers can tie it to a state instead of mount. */
  sweepClass?: string;
}) {
  return (
    <span
      role="progressbar"
      aria-label="Avance"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative flex size-11 shrink-0 items-center justify-center"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 36 36"
        className="absolute inset-0 -rotate-90"
        fill="none"
        strokeWidth="3"
      >
        <circle cx="18" cy="18" r="15" stroke="var(--line)" />
        {pct > 0 && (
          <circle
            cx="18"
            cy="18"
            r="15"
            pathLength={100}
            stroke={tone}
            strokeLinecap="round"
            strokeDashoffset={100 - pct}
            className={sweepClass}
            style={{ "--delay": `${delay}ms` } as CSSProperties}
          />
        )}
      </svg>
      <span
        aria-hidden="true"
        className="tabular text-[0.6875rem] font-semibold"
      >
        {pct}%
      </span>
    </span>
  );
}

/**
 * A thin bar that fills from the left, with the percentage at its end unless
 * `showValue` is off (the caller then shows the number elsewhere).
 */
export function ProgressMeter({
  pct,
  tone,
  delay,
  showValue = true,
}: {
  pct: number;
  tone: string;
  delay: number;
  showValue?: boolean;
}) {
  return (
    <div
      role="progressbar"
      aria-label="Avance"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="flex items-center gap-2.5"
    >
      <span
        aria-hidden="true"
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/25"
      >
        <span
          className="animate-bar-fill block h-full rounded-full"
          style={
            {
              width: `${pct}%`,
              backgroundColor: tone,
              "--delay": `${delay}ms`,
            } as CSSProperties
          }
        />
      </span>
      {showValue && (
        <span
          aria-hidden="true"
          className="tabular w-9 text-right text-meta text-muted"
        >
          {pct}%
        </span>
      )}
    </div>
  );
}
