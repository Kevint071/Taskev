/** Mutually exclusive slices of a group's tasks, shown one at a time. */
export type GroupTaskView = "pendientes" | "no_programadas" | "completadas";

export const GROUP_TASK_VIEWS: { value: GroupTaskView; label: string }[] = [
  { value: "pendientes", label: "Pendientes" },
  { value: "completadas", label: "Completadas" },
  { value: "no_programadas", label: "No programadas" },
];

export const GROUP_TASK_VIEW_PARAM = "vista";

const DEFAULT_VIEW: GroupTaskView = "pendientes";

/** Falls back to "pendientes" for missing or unknown query values. */
export function parseGroupTaskView(
  value: string | null | undefined,
): GroupTaskView {
  return GROUP_TASK_VIEWS.some((view) => view.value === value)
    ? (value as GroupTaskView)
    : DEFAULT_VIEW;
}

/** The default view keeps the bare group URL. */
export function groupTaskViewHref(
  groupId: string,
  view: GroupTaskView,
): string {
  const base = `/groups/${groupId}`;
  return view === DEFAULT_VIEW
    ? base
    : `${base}?${GROUP_TASK_VIEW_PARAM}=${view}`;
}

type ViewTask = { status: string; dueDate: string | null };

/**
 * Completed tasks go to "completadas" whatever their date; open tasks split
 * on whether they have a due date.
 */
export function groupTaskViewOf(task: ViewTask): GroupTaskView {
  if (task.status === "completada") return "completadas";
  return task.dueDate ? "pendientes" : "no_programadas";
}

export function splitGroupTasks<T extends ViewTask>(
  tasks: T[],
): Record<GroupTaskView, T[]> {
  const split: Record<GroupTaskView, T[]> = {
    pendientes: [],
    no_programadas: [],
    completadas: [],
  };
  for (const task of tasks) split[groupTaskViewOf(task)].push(task);
  return split;
}
