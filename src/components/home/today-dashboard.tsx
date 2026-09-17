import Link from "next/link";
import { LocalDate } from "@/components/local-date";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/panel";
import { ProgressChip } from "@/components/ui/progress-chip";
import { StatusBadge, StatusDot } from "@/components/ui/status-badge";
import {
  getUserTaskOverview,
  type OverviewTask,
  type ProjectOverview,
} from "@/lib/data/overview";
import { formatDueDate } from "@/lib/format";
import { buildTodaySections } from "@/lib/today";

export async function TodayDashboard({
  userId,
  name,
}: {
  userId: string;
  name: string | null;
}) {
  const now = new Date();
  const { tasks, projects } = await getUserTaskOverview(userId, now);
  const { next, overdue, thisWeek } = buildTodaySections(tasks, now);
  const firstName = name?.split(" ")[0];

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

      {next ? (
        <NextTask task={next} />
      ) : (
        <EmptyState
          title={
            projects.length === 0
              ? "Empieza creando un proyecto"
              : "No tienes tareas abiertas"
          }
          description={
            projects.length === 0
              ? "Un proyecto agrupa tareas con un mismo objetivo. Después añade tareas y Taskev te dirá cuál va primero."
              : "Añade una tarea a cualquier proyecto y aparecerá aquí según su prioridad y fecha límite."
          }
          action={
            <ButtonLink href="/projects" variant="primary">
              {projects.length === 0 ? "Crear un proyecto" : "Ir a proyectos"}
            </ButtonLink>
          }
        />
      )}

      {next && (
        <div className="grid gap-4 md:grid-cols-2">
          <TaskSection
            title="Vencidas"
            tasks={overdue}
            empty="Nada vencido. Bien."
            tone="danger"
          />
          <TaskSection
            title="Próximos 7 días"
            tasks={thisWeek}
            empty="Nada vence esta semana."
          />
        </div>
      )}

      {projects.length > 0 && <ProjectsSummary projects={projects} />}
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
        {task.title}
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

function TaskSection({
  title,
  tasks,
  empty,
  tone,
}: {
  title: string;
  tasks: OverviewTask[];
  empty: string;
  tone?: "danger";
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-baseline gap-2 font-semibold">
        {title}
        <span
          className={`tabular text-meta font-medium ${
            tone === "danger" && tasks.length > 0 ? "text-danger" : "text-muted"
          }`}
        >
          {tasks.length}
        </span>
      </h2>
      <Panel>
        {tasks.length === 0 ? (
          <p className="px-4 py-3 text-muted">{empty}</p>
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

function ProjectsSummary({ projects }: { projects: ProjectOverview[] }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Proyectos</h2>
        <Link href="/projects" className="text-meta text-muted hover:text-ink">
          Ver todos
        </Link>
      </div>
      <Panel>
        <ul className="divide-y divide-line">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="flex items-center gap-4 px-4 py-2.5 transition-colors first:rounded-t-panel last:rounded-b-panel hover:bg-sunken"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {p.name}
                </span>
                <span className="tabular shrink-0 text-meta text-muted">
                  {p.openCount} {p.openCount === 1 ? "abierta" : "abiertas"}
                </span>
                <span title="Avance medio">
                  <ProgressChip value={p.avgProgress} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}
