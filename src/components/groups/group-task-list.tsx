import type { ReactNode } from "react";
import {
  groupTaskPanelId,
  groupTaskTabId,
} from "@/components/groups/group-task-tabs";
import type {
  LocalTask,
  TaskUpdates,
} from "@/components/task-detail/task-detail-view";
import { TaskRow } from "@/components/tasks/task-row";
import { EmptyState } from "@/components/ui/panel";
import type { GroupTaskView } from "@/lib/group-task-views";

const EMPTY_VIEW: Record<
  GroupTaskView,
  { title: string; description: string }
> = {
  pendientes: {
    title: "Nada pendiente",
    description:
      "Las tareas abiertas con fecha límite o prioridad aparecerán aquí.",
  },
  completadas: {
    title: "Aún no hay tareas completadas",
    description: "Lo que termines en este grupo quedará aquí.",
  },
  no_programadas: {
    title: "Todo está programado",
    description: "Las tareas abiertas sin fecha ni prioridad aparecerán aquí.",
  },
};

/** The tasks of one view (pendientes, completadas or no programadas). */
export function GroupTaskList({
  view,
  tasks,
  now,
  onTaskChange,
  onBlocked,
  emptyAction,
}: {
  view: GroupTaskView;
  /** Already filtered to `view`. */
  tasks: LocalTask[];
  now: Date;
  onTaskChange: (key: string, updates: TaskUpdates) => void;
  onBlocked: (message: string) => void;
  /** Call to action shown when the view is empty. */
  emptyAction?: ReactNode;
}) {
  return (
    // Keyed by view so switching tabs replays the reveal animation.
    <div
      key={view}
      role="tabpanel"
      id={groupTaskPanelId(view)}
      aria-labelledby={groupTaskTabId(view)}
      className="animate-reveal"
    >
      {tasks.length === 0 ? (
        <EmptyState
          title={EMPTY_VIEW[view].title}
          description={EMPTY_VIEW[view].description}
          action={emptyAction}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.key}
              task={task}
              now={now}
              showGroup={false}
              centerProgressOnDesktop
              inlineGroupStatus
              onStatusChange={(change) => onTaskChange(task.key, change)}
              onBlocked={onBlocked}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
