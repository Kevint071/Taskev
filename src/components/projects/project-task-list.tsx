import type {
  LocalTask,
  TaskUpdates,
} from "@/components/task-detail/task-detail-view";
import { TaskRow } from "@/components/tasks/task-row";
import { EmptyState } from "@/components/ui/panel";

/** The project's tasks split into incomplete and completed groups. */
export function ProjectTaskList({
  tasks,
  now,
  onTaskChange,
  onBlocked,
}: {
  tasks: LocalTask[];
  now: Date;
  onTaskChange: (key: string, updates: TaskUpdates) => void;
  onBlocked: (message: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Este proyecto no tiene tareas"
        description="Añade la primera con el botón de arriba."
      />
    );
  }

  const incompleteTasks = tasks.filter((t) => t.status !== "completada");
  const completedTasks = tasks.filter((t) => t.status === "completada");

  function renderTaskRow(task: LocalTask) {
    return (
      <TaskRow
        key={task.key}
        task={task}
        now={now}
        showProject={false}
        centerProgressOnDesktop
        inlineProjectStatus
        onStatusChange={(change) => onTaskChange(task.key, change)}
        onBlocked={onBlocked}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {incompleteTasks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-meta font-medium text-muted">
            Tareas incompletas
          </h2>
          <ul className="flex flex-col gap-2">
            {incompleteTasks.map((task) => renderTaskRow(task))}
          </ul>
        </div>
      )}
      {completedTasks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-meta font-medium text-muted">
            Tareas completadas
          </h2>
          <ul className="flex flex-col gap-2">
            {completedTasks.map((task) => renderTaskRow(task))}
          </ul>
        </div>
      )}
    </div>
  );
}
