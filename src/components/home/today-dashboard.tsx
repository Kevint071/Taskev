import Link from "next/link";
import type { ReactNode } from "react";
import { LocalDate } from "@/components/local-date";
import { ButtonLink } from "@/components/ui/button";
import { CalendarIcon, CheckIcon, FlameIcon } from "@/components/ui/icons";
import { EmptyState, Panel } from "@/components/ui/panel";
import { StatusDot } from "@/components/ui/status-badge";
import { STATUS_LABELS } from "@/components/project-types";
import {
  groupRecentCommentsByProject,
  type ProjectActivityGroup,
  type TaskActivityGroup,
} from "@/lib/activity";
import { getRecentComments } from "@/lib/data/activity";
import { getUserTaskOverview, type OverviewTask } from "@/lib/data/overview";
import { formatDueDate, formatRelativeTime, truncateWords } from "@/lib/format";
import { buildTodayMetrics, buildTodaySections } from "@/lib/today";

const IN_PROGRESS_LIMIT = 3;
const UNPLANNED_PREVIEW_LIMIT = 3;
const ACTIVITY_LIMIT = 5;

export async function TodayDashboard({
  userId,
  name,
}: {
  userId: string;
  name: string | null;
}) {
  const now = new Date();
  const [{ tasks, projectCount }, comments] = await Promise.all([
    getUserTaskOverview(userId, now),
    getRecentComments(userId, ACTIVITY_LIMIT),
  ]);
  const { top, overdue, dueToday, thisWeek } = buildTodaySections(tasks, now);
  const activity = groupRecentCommentsByProject(comments);
  const firstName = name?.split(" ")[0];

  const openTasks = tasks.filter((t) => t.status !== "completada");
  const blocked = openTasks.filter((t) => t.status === "bloqueada");
  const inProgress = openTasks
    .filter((t) => t.status === "en_curso")
    .slice(0, IN_PROGRESS_LIMIT);
  const unplanned = openTasks.filter(
    (t) => !t.dueDate && Number(t.priority) === 0,
  );
  const metrics = buildTodayMetrics(
    tasks.filter((t) => t.status === "completada").map((t) => t.completedAt),
    now,
  );

  return (
    <>
      <header>
        <h1 className="text-page font-semibold">
          {firstName ? `Hoy, ${firstName}` : "Hoy"}
        </h1>
        <p className="mt-1 text-muted first-letter:uppercase">
          <LocalDate
            date={now.toISOString()}
            options={{ weekday: "long", day: "numeric", month: "long" }}
          />
        </p>
      </header>

      {(metrics.completedToday > 0 ||
        metrics.completedThisWeek > 0 ||
        metrics.streak > 0) && <MetricsBar metrics={metrics} />}

      {top.length > 0 ? (
        <TopTasks tasks={top} />
      ) : (
        <EmptyState
          title={
            projectCount === 0
              ? "Empieza creando un proyecto"
              : "No tienes tareas abiertas"
          }
          description={
            projectCount === 0
              ? "Un proyecto agrupa tareas con un mismo objetivo. Después añade tareas y Taskev te dirá cuál va primero."
              : "Añade una tarea a cualquier proyecto y aparecerá aquí según su prioridad y fecha límite."
          }
          action={
            <ButtonLink href="/projects" variant="primary">
              {projectCount === 0 ? "Crear un proyecto" : "Ir a proyectos"}
            </ButtonLink>
          }
        />
      )}

      {blocked.length > 0 && (
        <TaskSection
          title="Bloqueadas"
          tasks={blocked}
          empty=""
          tone="blocked"
        />
      )}

      {top.length > 0 && (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))]">
          <TaskSection
            title="Vencidas"
            tasks={overdue}
            empty="Nada vencido. Bien."
            tone="danger"
          />
          <TaskSection title="Hoy" tasks={dueToday} empty="Nada vence hoy." />
          <TaskSection
            title="Próximos 7 días"
            tasks={thisWeek}
            empty="Nada vence esta semana."
          />
        </div>
      )}

      {inProgress.length > 0 && (
        <TaskSection title="En curso" tasks={inProgress} empty="" />
      )}

      {unplanned.length > 0 && <UnplannedNotice tasks={unplanned} />}

      {activity.length > 0 && <ActivityFeed groups={activity} />}
    </>
  );
}

function TopTasks({ tasks }: { tasks: OverviewTask[] }) {
  const [hero, ...rest] = tasks;

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <p className="text-meta font-medium text-accent">
        {tasks.length > 1 ? "Prioridades de hoy" : "Siguiente tarea"}
      </p>
      <HeroTask task={hero} />
      {rest.length > 0 && (
        <Panel className="overflow-hidden">
          <ul className="divide-y divide-line">
            {rest.map((task, i) => (
              <li key={task.id}>
                <SecondaryTask task={task} rank={i + 2} />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </section>
  );
}

function HeroTask({ task }: { task: OverviewTask }) {
  return (
    <Link
      href={`/projects/${task.projectId}`}
      className="group relative block overflow-hidden rounded-panel border border-line bg-accent-soft p-5 transition-colors dark:border-black/10 dark:bg-[#13151b] md:p-6"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-accent opacity-20 blur-2xl dark:opacity-30"
      />
      <div className="relative flex flex-col gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">
          Foco de hoy
        </span>
        <p className="text-[19px] font-bold leading-tight tracking-tight text-ink dark:text-white">
          {truncateWords(task.title, 14)}
        </p>
        <div className="flex min-w-0 items-center gap-2 text-[12px] leading-[18px] text-muted dark:text-white/60">
          <span className="truncate">{task.projectName}</span>
          <span aria-hidden="true" className="text-line-strong dark:text-white/25">
            ·
          </span>
          <span className="inline-flex items-center gap-1.5">
            <StatusDot status={task.status} />
            {STATUS_LABELS[task.status]}
          </span>
          {task.dueDate && (
            <>
              <span aria-hidden="true" className="text-line-strong dark:text-white/25">
                ·
              </span>
              <span className="shrink-0 tabular">
                vence {formatDueDate(task.dueDate)}
              </span>
            </>
          )}
        </div>
        <div
          role="progressbar"
          aria-label={`Avance de ${task.title}`}
          aria-valuenow={task.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${task.progressPct}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

function SecondaryTask({ task, rank }: { task: OverviewTask; rank: number }) {
  return (
    <Link
      href={`/projects/${task.projectId}`}
      className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-sunken"
    >
      <span className="tabular w-4 shrink-0 text-meta font-semibold text-muted">
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">
        {truncateWords(task.title, 14)}
      </span>
      <span className="tabular shrink-0 text-meta font-medium text-muted">
        {task.progressPct}%
      </span>
    </Link>
  );
}

function MetricsBar({
  metrics,
}: {
  metrics: {
    completedToday: number;
    completedThisWeek: number;
    streak: number;
  };
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-meta font-medium text-muted">Tu progreso</p>
        {metrics.streak > 0 && (
          <span className="tabular inline-flex items-center gap-1.5 rounded-full bg-sunken py-1.5 pl-2 pr-3 text-[13px] font-bold">
            <FlameIcon className="size-[18px]" />
            {metrics.streak}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MetricCell
          label="completadas hoy"
          value={metrics.completedToday}
          tint="rgba(111, 197, 154, 0.16)"
          icon={<CheckIcon className="size-[17px] text-status-done" />}
        />
        <MetricCell
          label="esta semana"
          value={metrics.completedThisWeek}
          tint="rgba(143, 164, 245, 0.16)"
          icon={<CalendarIcon className="size-[17px] text-accent" />}
        />
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tint: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-panel bg-sunken p-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: tint }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="tabular text-[19px] font-semibold leading-tight tracking-tight">
          {value}
        </p>
        <p className="truncate text-[11px] leading-tight text-muted">
          {label}
        </p>
      </div>
    </div>
  );
}

function TaskSection({
  title,
  tasks,
  empty,
  tone,
}: {
  title: string;
  tasks: OverviewTask[];
  empty: string;
  tone?: "danger" | "blocked";
}) {
  const toneClass =
    tone === "danger"
      ? "text-danger"
      : tone === "blocked"
        ? "text-status-blocked"
        : "text-muted";

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h2 className="flex items-baseline gap-2 font-semibold">
        {title}
        <span
          className={`tabular text-meta font-medium ${
            tasks.length > 0 ? toneClass : "text-muted"
          }`}
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
              <li key={task.id}>
                <Link
                  href={`/projects/${task.projectId}`}
                  className="flex min-w-0 items-center gap-2.5 px-4 py-2.5 transition-colors first:rounded-t-panel last:rounded-b-panel hover:bg-sunken sm:gap-3"
                >
                  <StatusDot status={task.status} />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {task.title}
                  </span>
                  <span className="shrink-0 truncate max-w-[7rem] text-meta text-muted">
                    {task.projectName}
                  </span>
                  {task.dueDate && (
                    <span
                      className={`tabular shrink-0 text-meta ${
                        tone === "danger" ? "text-danger" : "text-muted"
                      }`}
                    >
                      {formatDueDate(task.dueDate)}
                    </span>
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

function UnplannedNotice({ tasks }: { tasks: OverviewTask[] }) {
  const preview = tasks.slice(0, UNPLANNED_PREVIEW_LIMIT);
  const rest = tasks.length - preview.length;

  return (
    <Panel className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-meta">
      <span className="font-medium">
        {tasks.length} {tasks.length === 1 ? "tarea" : "tareas"} sin fecha ni
        prioridad
      </span>
      <span className="text-muted">— quizá deberías planearlas:</span>
      {preview.map((task, i) => (
        <span key={task.id} className="text-muted">
          <Link
            href={`/projects/${task.projectId}`}
            className="text-ink hover:text-accent"
          >
            {task.title}
          </Link>
          {i < preview.length - 1 && ","}
        </span>
      ))}
      {rest > 0 && <span className="text-muted">+{rest} más</span>}
    </Panel>
  );
}

function ActivityFeed({ groups }: { groups: ProjectActivityGroup[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">Actividad reciente</h2>
      <div className="flex flex-col gap-4">
        {groups.map((project) => (
          <div key={project.projectId} className="flex flex-col gap-2">
            <h3 className="text-meta font-medium text-muted">
              {project.projectName}
            </h3>
            <Panel>
              <ul className="divide-y divide-line">
                {project.tasks.map((task) => (
                  <li key={task.taskId}>
                    <ActivityTaskRow
                      projectId={project.projectId}
                      task={task}
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityTaskRow({
  projectId,
  task,
}: {
  projectId: string;
  task: TaskActivityGroup;
}) {
  return (
    <Link
      href={`/projects/${projectId}`}
      className="flex min-w-0 flex-col gap-2 px-4 py-3 transition-colors first:rounded-t-panel last:rounded-b-panel hover:bg-sunken"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate font-medium">{task.taskTitle}</p>
        {task.comments.length > 1 && (
          <span className="tabular shrink-0 text-meta text-muted">
            {task.comments.length} comentarios
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-1.5 border-l-2 border-line pl-3">
        {task.comments.map((comment) => (
          <li key={comment.id} className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 truncate text-muted">
              {comment.body}
            </span>
            <span className="tabular shrink-0 text-meta text-muted">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </Link>
  );
}
