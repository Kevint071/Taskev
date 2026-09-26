import { cookies } from "next/headers";
import Link from "next/link";
import { LocalDate } from "@/components/local-date";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/panel";
import {
  type GroupActivity,
  nestRecentCommentsByGroup,
  type TaskActivity,
} from "@/lib/activity";
import { taskHref } from "@/lib/back-navigation";
import { getRecentComments } from "@/lib/data/activity";
import { getUserTaskOverview, type OverviewTask } from "@/lib/data/overview";
import { formatRelativeTime } from "@/lib/format";
import { dayKeyInTimeZone, TIME_ZONE_COOKIE } from "@/lib/time-zone";
import { buildTodaySections, dueAroundDay } from "@/lib/today";
import { DueTodaySection } from "./due-today-section";
import { TodayMetrics } from "./today-metrics";
import { TopTasks } from "./top-tasks";

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
  const [{ tasks, groupCount }, comments, cookieStore] = await Promise.all([
    getUserTaskOverview(userId, now),
    getRecentComments(userId, ACTIVITY_LIMIT),
    cookies(),
  ]);
  const { top } = buildTodaySections(tasks, now);
  const serverToday = dayKeyInTimeZone(
    now,
    cookieStore.get(TIME_ZONE_COOKIE)?.value,
  );
  const utcToday = dayKeyInTimeZone(now, "UTC");
  const activity = nestRecentCommentsByGroup(comments);
  const firstName = name?.split(" ")[0];

  const openTasks = tasks.filter((t) => t.status !== "completada");
  // Open tasks exist, but none is workable, so the top 3 came out empty.
  const allStalled = top.length === 0 && openTasks.length > 0;
  const unplanned = openTasks.filter(
    (t) => !t.dueDate && Number(t.priority) === 0,
  );
  const completedAt = tasks.flatMap((t) =>
    t.status === "completada" && t.completedAt
      ? [t.completedAt.toISOString()]
      : [],
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

      <TodayMetrics completedAt={completedAt} serverNow={now.toISOString()} />

      {top.length > 0 ? (
        <TopTasks tasks={top} serverNow={now.toISOString()} />
      ) : (
        <EmptyState
          title={
            groupCount === 0
              ? "Empieza creando un grupo"
              : allStalled
                ? "Nada listo para trabajar"
                : "No tienes tareas abiertas"
          }
          description={
            groupCount === 0
              ? "Un grupo reúne tareas con un mismo objetivo. Después añade tareas y Taskev te dirá cuál va primero."
              : allStalled
                ? "Tus tareas abiertas están bloqueadas o en pausa. Desbloquea o reanuda alguna y aparecerá aquí."
                : "Añade una tarea a cualquier grupo y aparecerá aquí según su prioridad y fecha límite."
          }
          action={
            <ButtonLink
              href={allStalled ? "/tasks" : "/groups"}
              variant="primary"
            >
              {groupCount === 0
                ? "Crear un grupo"
                : allStalled
                  ? "Ver tareas"
                  : "Ir a grupos"}
            </ButtonLink>
          }
        />
      )}

      {top.length > 0 && (
        <DueTodaySection
          tasks={dueAroundDay(tasks, utcToday)}
          serverToday={serverToday}
        />
      )}

      {unplanned.length > 0 && <UnplannedNotice tasks={unplanned} />}

      {activity.length > 0 && <ActivityFeed groups={activity} />}
    </>
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
            href={taskHref(task.groupId, task.id, "hoy")}
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

function ActivityFeed({ groups }: { groups: GroupActivity[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">Actividad reciente</h2>
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.groupId} className="flex flex-col gap-2">
            <h3 className="text-meta font-medium text-muted">
              {group.groupName}
            </h3>
            <Panel>
              <ul className="divide-y divide-line">
                {group.tasks.map((task) => (
                  <li key={task.taskId}>
                    <ActivityTaskRow groupId={group.groupId} task={task} />
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
  groupId,
  task,
}: {
  groupId: string;
  task: TaskActivity;
}) {
  return (
    <Link
      href={taskHref(groupId, task.taskId, "hoy")}
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
