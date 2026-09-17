import Link from "next/link";
import { LocalDate } from "@/components/local-date";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/panel";
import { StatusBadge, StatusDot } from "@/components/ui/status-badge";
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
        <div className="grid gap-4 md:grid-cols-3">
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
  const ranked = tasks.length > 1;

  return (
    <Panel className="relative overflow-hidden">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-accent"
      />
      <p className="px-5 pt-4 pb-1 pl-6 text-meta font-medium text-accent md:px-6 md:pt-5 md:pl-7">
        {ranked ? "Prioridades de hoy" : "Siguiente tarea"}
      </p>
      <ul className="divide-y divide-line">
        {tasks.map((task, i) => (
          <li key={task.id}>
            <PriorityTask task={task} rank={ranked ? i + 1 : undefined} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function PriorityTask({ task, rank }: { task: OverviewTask; rank?: number }) {
  return (
    <Link
      href={`/projects/${task.projectId}`}
      className="flex items-start gap-3 px-5 py-4 pl-6 transition-colors hover:bg-sunken md:pl-7"
    >
      {rank && <RankBadge rank={rank} emphasis={rank === 1} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[16px] font-semibold tracking-tight">
            {truncateWords(task.title, 14)}
          </p>
          <span className="tabular shrink-0 text-meta font-medium text-muted">
            {task.progressPct}%
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
          <span className="truncate">{task.projectName}</span>
          <StatusBadge status={task.status} />
          {task.dueDate && (
            <span className="tabular">Vence {formatDueDate(task.dueDate)}</span>
          )}
        </div>
        <div
          role="progressbar"
          aria-label={`Avance de ${task.title}`}
          aria-valuenow={task.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2 h-1 overflow-hidden rounded-full bg-sunken"
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

function RankBadge({ rank, emphasis }: { rank: number; emphasis?: boolean }) {
  return (
    <span
      className={`tabular mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-meta font-semibold ${
        emphasis ? "bg-accent text-accent-ink" : "bg-sunken text-muted"
      }`}
    >
      {rank}
    </span>
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
    <div className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-panel border border-line bg-raised shadow-panel">
      <MetricStat
        label="Hoy"
        value={metrics.completedToday}
        suffix="completadas"
      />
      <MetricStat
        label="Esta semana"
        value={metrics.completedThisWeek}
        suffix="completadas"
      />
      <MetricStat
        label="Racha"
        value={metrics.streak}
        suffix={metrics.streak === 1 ? "día" : "días"}
      />
    </div>
  );
}

function MetricStat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <p className="text-meta text-muted">{label}</p>
      <p className="tabular">
        <span className="text-[22px] font-semibold tracking-tight">
          {value}
        </span>{" "}
        <span className="text-meta text-muted">{suffix}</span>
      </p>
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
    <section className="flex flex-col gap-2">
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
      <Panel>
        {tasks.length === 0 ? (
          empty && <p className="px-4 py-3 text-muted">{empty}</p>
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/projects/${task.projectId}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors first:rounded-t-panel last:rounded-b-panel hover:bg-sunken"
                >
                  <StatusDot status={task.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{task.title}</p>
                    <p className="truncate text-meta text-muted">
                      {task.projectName}
                    </p>
                  </div>
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
      className="flex flex-col gap-2 px-4 py-3 transition-colors first:rounded-t-panel last:rounded-b-panel hover:bg-sunken"
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
