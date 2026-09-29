import type { GlobalTask } from "@/components/group-types";
import { taskPanelId, taskTabId } from "@/components/groups/group-task-tabs";
import { TaskRow } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import type { BackSource } from "@/lib/back-navigation";

/** Mutually exclusive slices of the global task list, shown one at a time. */
export type GlobalTaskView = "sin_completar" | "completadas";

export const GLOBAL_TASK_TABS_PREFIX = "tasks";

const EMPTY_VIEW: Record<
  GlobalTaskView,
  { title: string; description: string }
> = {
  sin_completar: {
    title: "Nada por completar",
    description: "Todas tus tareas están completadas.",
  },
  completadas: {
    title: "Aún no hay tareas completadas",
    description: "Lo que termines quedará aquí.",
  },
};

/** The tasks of one view (sin completar or completadas), as separate cards. */
export function GlobalTaskList({
  view,
  tasks,
  now,
  from,
  onClearFilters,
}: {
  view: GlobalTaskView;
  /** Already filtered and sorted for `view`. */
  tasks: GlobalTask[];
  now: Date;
  from?: BackSource;
  /** Set while filters are active: an empty view then reads as "no match". */
  onClearFilters?: () => void;
}) {
  return (
    // Keyed by view so switching tabs replays the reveal animation.
    <div
      key={view}
      role="tabpanel"
      id={taskPanelId(GLOBAL_TASK_TABS_PREFIX, view)}
      aria-labelledby={taskTabId(GLOBAL_TASK_TABS_PREFIX, view)}
      className="animate-reveal"
    >
      {tasks.length === 0 ? (
        <EmptyState
          title={
            onClearFilters ? "Ninguna tarea coincide" : EMPTY_VIEW[view].title
          }
          description={
            onClearFilters
              ? "Prueba con otra búsqueda o quita algún filtro."
              : EMPTY_VIEW[view].description
          }
          action={
            onClearFilters ? (
              <Button variant="secondary" onClick={onClearFilters}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              now={now}
              from={from}
              centerProgressOnDesktop
              inlineGroupStatus
            />
          ))}
        </ul>
      )}
    </div>
  );
}
