import Link from "next/link";
import type { ComponentType, CSSProperties } from "react";
import {
  CalendarIcon,
  CheckIcon,
  LockIcon,
  RefreshIcon,
  TriangleAlertIcon,
} from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { type BackSource, taskHref } from "@/lib/back-navigation";
import type { OverviewTask } from "@/lib/data/overview";
import { formatDueDate } from "@/lib/format";

export const STATUS_COLOR: Record<OverviewTask["status"], string> = {
  disponible: "var(--status-open)",
  en_curso: "var(--status-progress)",
  bloqueada: "var(--status-blocked)",
  pausada: "var(--status-paused)",
  completada: "var(--status-done)",
};

export type TaskSectionTone = "danger" | "blocked" | "accent" | "progress";

type ToneConfig = {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  color: string;
  tintLight: string;
  tintDark: string;
};

const TONE: Record<TaskSectionTone, ToneConfig> = {
  danger: {
    icon: TriangleAlertIcon,
    color: "var(--danger)",
    tintLight: "rgba(192, 57, 43, 0.14)",
    tintDark: "rgba(240, 138, 124, 0.16)",
  },
  blocked: {
    icon: LockIcon,
    color: "var(--status-blocked)",
    tintLight: "rgba(184, 134, 11, 0.14)",
    tintDark: "rgba(217, 164, 65, 0.16)",
  },
  accent: {
    icon: CalendarIcon,
    color: "var(--accent)",
    tintLight: "rgba(53, 83, 199, 0.12)",
    tintDark: "rgba(143, 164, 245, 0.16)",
  },
  progress: {
    icon: RefreshIcon,
    color: "var(--status-progress)",
    tintLight: "rgba(53, 83, 199, 0.12)",
    tintDark: "rgba(143, 164, 245, 0.16)",
  },
};

export function TaskSection({
  title,
  tasks,
  empty,
  tone,
  from,
}: {
  title: string;
  tasks: OverviewTask[];
  empty: string;
  tone: TaskSectionTone;
  from?: BackSource;
}) {
  const cfg = TONE[tone];
  const Icon = cfg.icon;

  const isEmpty = tasks.length === 0;

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-control dark:hidden"
            style={{ backgroundColor: cfg.tintLight }}
          >
            <Icon className="size-3.5" style={{ color: cfg.color }} />
          </span>
          <span
            className="hidden size-6 shrink-0 items-center justify-center rounded-control dark:flex"
            style={{ backgroundColor: cfg.tintDark }}
          >
            <Icon className="size-3.5" style={{ color: cfg.color }} />
          </span>
          {title}
          {!isEmpty && (
            <span
              className="tabular text-meta font-medium"
              style={{ color: cfg.color }}
            >
              {tasks.length}
            </span>
          )}
        </h2>
        {isEmpty && empty && (
          // Nothing to list: a quiet pill beside the title instead of an empty panel.
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-line bg-raised py-1 pr-3 pl-2 text-meta text-muted shadow-panel">
            <CheckIcon className="size-3.5 shrink-0 text-status-done" />
            <span className="truncate">{empty}</span>
          </span>
        )}
      </div>
      {!isEmpty && (
        <Panel className="min-w-0 w-full overflow-hidden">
          <ul className="divide-y divide-line">
            {tasks.map((task) => (
              <li key={task.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1.5 left-0 w-[3px] rounded-full"
                  style={{ backgroundColor: STATUS_COLOR[task.status] }}
                />
                <Link
                  href={taskHref(task.projectId, task.id, from)}
                  className="flex min-w-0 items-center gap-2.5 px-4 py-2.5 pl-5 transition-colors first:rounded-t-panel last:rounded-b-panel hover:bg-sunken sm:gap-3"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {task.title}
                  </span>
                  <span className="shrink-0 truncate max-w-[7rem] text-meta text-muted">
                    {task.projectName}
                  </span>
                  {tone === "progress" ? (
                    <ProgressRing
                      pct={task.progressPct}
                      color={STATUS_COLOR[task.status]}
                    />
                  ) : (
                    task.dueDate && (
                      <span
                        className="tabular shrink-0 text-meta font-semibold"
                        style={{
                          color:
                            tone === "danger" || tone === "blocked"
                              ? cfg.color
                              : "var(--muted)",
                        }}
                      >
                        {formatDueDate(task.dueDate)}
                      </span>
                    )
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </section>
  );
}

export function ProgressRing({
  pct,
  color,
  size = "sm",
}: {
  pct: number;
  color: string;
  size?: "sm" | "md";
}) {
  if (pct === 0) return null;

  const md = size === "md";
  return (
    <span
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`flex shrink-0 items-center justify-center rounded-full ${md ? "size-8" : "size-6"}`}
      style={{
        background: `conic-gradient(${color} ${pct}%, var(--line-strong) 0)`,
      }}
    >
      <span
        className={`tabular flex items-center justify-center rounded-full bg-raised font-bold text-ink ${md ? "size-6 text-[9px]" : "size-[18px] text-[8px]"}`}
      >
        {pct}
      </span>
    </span>
  );
}
