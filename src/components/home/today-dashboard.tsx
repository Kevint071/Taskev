import { cookies } from "next/headers";
import { LocalDate } from "@/components/local-date";
import { TaskSection } from "@/components/task-section";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { groupEventsByTask } from "@/lib/activity";
import { getActivitySince } from "@/lib/data/activity";
import { getUserTaskOverview } from "@/lib/data/overview";
import {
  dayKeyInTimeZone,
  startOfDayInTimeZone,
  TIME_ZONE_COOKIE,
} from "@/lib/time-zone";
import { buildTodaySections, dueAroundDay } from "@/lib/today";
import { ActivityFeed } from "./activity-feed";
import { DueTodaySection } from "./due-today-section";
import { TodayMetrics } from "./today-metrics";
import { TopTasks } from "./top-tasks";

export async function TodayDashboard({
  userId,
  name,
}: {
  userId: string;
  name: string | null;
}) {
  const now = new Date();
  const cookieStore = await cookies();
  const timeZone = cookieStore.get(TIME_ZONE_COOKIE)?.value;
  const [{ tasks, groupCount }, events] = await Promise.all([
    getUserTaskOverview(userId, now),
    getActivitySince(userId, startOfDayInTimeZone(now, timeZone)),
  ]);
  const { top } = buildTodaySections(tasks, now);
  const serverToday = dayKeyInTimeZone(now, timeZone);
  const utcToday = dayKeyInTimeZone(now, "UTC");
  const activity = groupEventsByTask(events);
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

      {unplanned.length > 0 && (
        <TaskSection
          title="Sin fecha ni prioridad"
          tasks={unplanned}
          empty=""
          tone="neutral"
          from="hoy"
        />
      )}

      {activity.length > 0 && <ActivityFeed tasks={activity} />}
    </>
  );
}
