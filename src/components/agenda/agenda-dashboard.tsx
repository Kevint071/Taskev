import { TaskSection } from "@/components/task-section";
import { PageHeader } from "@/components/ui/panel";
import { getUserTaskOverview } from "@/lib/data/overview";
import { buildTodaySections } from "@/lib/today";

export async function AgendaDashboard({ userId }: { userId: string }) {
  const now = new Date();
  const { tasks } = await getUserTaskOverview(userId, now);
  const { overdue, thisWeek } = buildTodaySections(tasks, now);

  const openTasks = tasks.filter((t) => t.status !== "completada");
  const blocked = openTasks.filter((t) => t.status === "bloqueada");
  const inProgress = openTasks.filter((t) => t.status === "en_curso");

  const isEmpty =
    blocked.length === 0 &&
    overdue.length === 0 &&
    thisWeek.length === 0 &&
    inProgress.length === 0;

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Todo lo que necesita seguimiento fuera de las prioridades de hoy: bloqueadas, vencidas, lo que viene esta semana y lo que ya está en marcha."
      />

      {isEmpty ? (
        <p className="text-muted">
          Nada bloqueado, vencido, próximo ni en curso. Vas al día.
        </p>
      ) : (
        <>
          <TaskSection
            title="Bloqueadas"
            tasks={blocked}
            empty="Nada bloqueado ahora mismo."
            tone="blocked"
          />

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
            tone="accent"
          />

          <TaskSection
            title="En curso"
            tasks={inProgress}
            empty="Nada en curso ahora mismo."
            tone="progress"
          />
        </>
      )}
    </>
  );
}
