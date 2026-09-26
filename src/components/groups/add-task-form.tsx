import Link from "next/link";
import { PlusIcon } from "@/components/ui/icons";

/** Shortcut that opens the new task form on desktop. */
export const NEW_TASK_SHORTCUT = "n";

/** Where a group's new tasks are written, with every field at hand. */
export function newTaskHref(groupId: string): string {
  return `/groups/${groupId}/tasks/new`;
}

/** Desktop entry point, placed beside the group title. */
export function NewTaskButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-keyshortcuts={NEW_TASK_SHORTCUT.toUpperCase()}
      className="group hidden h-9 shrink-0 items-center gap-2 rounded-full bg-accent px-3.5 font-medium text-accent-ink shadow-sm shadow-accent/25 transition-[background-color,box-shadow,transform] hover:bg-accent/90 hover:shadow-md hover:shadow-accent/30 active:scale-[0.97] md:inline-flex"
    >
      <PlusIcon className="size-4 transition-transform duration-200 group-hover:rotate-90" />
      Nueva tarea
      <kbd className="ml-0.5 flex size-5 items-center justify-center rounded-[5px] bg-accent-ink/20 font-sans text-[11px] font-semibold">
        {NEW_TASK_SHORTCUT.toUpperCase()}
      </kbd>
    </Link>
  );
}

/** Phone entry point, floating above the tab bar. */
export function NewTaskFab({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Nueva tarea"
      className="animate-fab-in fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-10 flex size-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-accent/35 ring-4 ring-surface transition-transform active:scale-90 md:hidden"
    >
      <PlusIcon className="size-6" />
    </Link>
  );
}

/** Whether a keydown should open the new task form rather than go to a field. */
export function isNewTaskShortcut(event: KeyboardEvent) {
  if (event.key.toLowerCase() !== NEW_TASK_SHORTCUT) return false;
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
    return false;
  }
  const target = event.target as HTMLElement | null;
  return !target?.closest(
    "input, textarea, select, [contenteditable=''], [contenteditable='true'], dialog, [role='dialog']",
  );
}
