/** Screens that link to a task and that the task's back arrow can return to. */
export type BackSource = "hoy" | "tasks";

const SOURCES: Record<BackSource, { href: string; label: string }> = {
  hoy: { href: "/", label: "Hoy" },
  tasks: { href: "/tasks", label: "Tareas" },
};

export function taskHref(
  groupId: string,
  taskId: string,
  from?: BackSource,
): string {
  const base = `/groups/${groupId}/tasks/${taskId}`;
  return from ? `${base}?from=${from}` : base;
}

/** Where a task's back arrow leads: the screen it was opened from, else its group. */
export function resolveBack(
  from: string | string[] | undefined,
  group: { id: string; name: string },
): { href: string; label: string } {
  if (typeof from === "string" && Object.hasOwn(SOURCES, from)) {
    return SOURCES[from as BackSource];
  }
  return { href: `/groups/${group.id}`, label: group.name };
}
