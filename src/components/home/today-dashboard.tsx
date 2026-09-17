import Link from "next/link";
import { LocalDate } from "@/components/local-date";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/panel";
import { StatusBadge, StatusDot } from "@/components/ui/status-badge";
import { getRecentComments, type RecentComment } from "@/lib/data/activity";
import { getUserTaskOverview, type OverviewTask } from "@/lib/data/overview";
import { formatDateTime, formatDueDate, truncateWords } from "@/lib/format";
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
  const [{ tasks, projectCount }, activity] = await Promise.all([
    getUserTaskOverview(userId, now),
    getRecentComments(userId, ACTIVITY_LIMIT),
  ]);
  const { next, overdue, dueToday, thisWeek } = buildTodaySections(tasks, now);
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

      {next ? (
        <NextTask task={next} />
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

      {next && (
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

      {activity.length > 0 && <ActivityFeed items={activity} />}
    </>
  );
}

function NextTask({ task }: { task: OverviewTask }) {
  return (
    <Panel className="relative flex flex-col gap-4 overflow-hidden p-5 pl-6 md:p-6 md:pl-7">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-accent"
      />
      <p className="text-meta font-medium text-accent">Siguiente tarea</p>
      <Link
        href={`/projects/${task.projectId}`}
        className="w-fit rounded-[4px] text-[22px] leading-[1.35] font-semibold tracking-tight hover:text-accent md:text-[26px]"
      >
        {truncateWords(task.title, 15)}
      </Link>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-meta text-muted">
        <span>{task.projectName}</span>
        <StatusBadge status={task.status} />
        {task.dueDate && (
          <span className="tabular">Vence {formatDueDate(task.dueDate)}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="Avance"
          aria-valuenow={task.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${task.progressPct}%` }}
          />
        </div>
        <span className="tabular text-meta font-medium">
          {task.progressPct}%
        </span>
      </div>
    </Panel>
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

function ActivityFeed({ items }: { items: RecentComment[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">Actividad reciente</h2>
      <Panel>
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/projects/${item.projectId}`}
                className="flex flex-col gap-1 px-4 py-2.5 transition-colors first:rounded-t-panel last:rounded-b-panel hover:bg-sunken"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-meta font-medium">
                    {item.taskTitle}
                  </p>
                  <span className="tabular shrink-0 text-meta text-muted">
                    {formatDateTime(item.createdAt.toISOString())}
                  </span>
                </div>
                <p className="truncate text-muted">{item.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}
