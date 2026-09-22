/** Screens that link to a task and that the task's back arrow can return to. */
export type BackSource = "hoy" | "agenda" | "tasks";

const SOURCES: Record<BackSource, { href: string; label: string }> = {
  hoy: { href: "/", label: "Hoy" },
  agenda: { href: "/agenda", label: "Agenda" },
  tasks: { href: "/tasks", label: "Tareas" },
};

export function taskHref(
  projectId: string,
  taskId: string,
  from?: BackSource,
): string {
  const base = `/projects/${projectId}/tasks/${taskId}`;
  return from ? `${base}?from=${from}` : base;
}

/** Where a task's back arrow leads: the screen it was opened from, else its project. */
export function resolveBack(
  from: string | string[] | undefined,
  project: { id: string; name: string },
): { href: string; label: string } {
  if (typeof from === "string" && Object.hasOwn(SOURCES, from)) {
    return SOURCES[from as BackSource];
  }
  return { href: `/projects/${project.id}`, label: project.name };
}
