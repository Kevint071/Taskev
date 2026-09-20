import Link from "next/link";
import type { ComponentType, CSSProperties } from "react";
import {
  CalendarIcon,
  LockIcon,
  RefreshIcon,
  TriangleAlertIcon,
} from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
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
  barColor: string;
};

const TONE: Record<TaskSectionTone, ToneConfig> = {
  danger: {
    icon: TriangleAlertIcon,
    color: "var(--danger)",
    tintLight: "rgba(192, 57, 43, 0.14)",
    tintDark: "rgba(240, 138, 124, 0.16)",
    barColor: "var(--danger)",
  },
  blocked: {
    icon: LockIcon,
    color: "var(--status-blocked)",
    tintLight: "rgba(184, 134, 11, 0.14)",
    tintDark: "rgba(217, 164, 65, 0.16)",
    barColor: "var(--status-paused)",
  },
  accent: {
    icon: CalendarIcon,
    color: "var(--accent)",
    tintLight: "rgba(53, 83, 199, 0.12)",
    tintDark: "rgba(143, 164, 245, 0.16)",
    barColor: "var(--accent)",
  },
  progress: {
    icon: RefreshIcon,
    color: "var(--status-progress)",
    tintLight: "rgba(53, 83, 199, 0.12)",
    tintDark: "rgba(143, 164, 245, 0.16)",
    barColor: "var(--status-progress)",
  },
};

export function TaskSection({
  title,
  tasks,
  empty,
  tone,
}: {
  title: string;
  tasks: OverviewTask[];
  empty: string;
  tone: TaskSectionTone;
}) {
  const cfg = TONE[tone];
  const Icon = cfg.icon;

  return (
    <section className="flex min-w-0 flex-col gap-2">
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
        <span
          className="tabular text-meta font-medium"
          style={{ color: tasks.length > 0 ? cfg.color : "var(--muted)" }}
        >
          {tasks.length}
        </span>
      </h2>
      <Panel className="min-w-0 w-full overflow-hidden">
        {tasks.length === 0 ? (
          empty && <p className="px-4 py-3 text-muted">{empty}</p>
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((task) => (
              <li key={task.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1.5 left-0 w-[3px] rounded-full"
                  style={{ backgroundColor: cfg.barColor }}
                />
                <Link
                  href={`/projects/${task.projectId}/tasks/${task.id}`}
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
        )}
      </Panel>
    </section>
  );
}

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  return (
    <span
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="flex size-6 shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${pct}%, var(--line-strong) 0)`,
      }}
    >
      <span className="tabular flex size-[18px] items-center justify-center rounded-full bg-raised text-[8px] font-bold text-ink">
        {pct}
      </span>
    </span>
  );
}
