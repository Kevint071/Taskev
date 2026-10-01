import { PlusIcon } from "@/components/ui/icons";

/** Desktop entry point, a quiet text action at the end of the filter row. */
export function NewGroupButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group hidden h-9 shrink-0 items-center gap-1.5 rounded-control px-2.5 text-ui font-medium text-accent transition-[background-color,transform] hover:bg-accent-soft active:scale-[0.98] md:inline-flex"
    >
      <PlusIcon className="size-4 transition-transform duration-200 group-hover:rotate-90" />
      Nuevo grupo
    </button>
  );
}

/** Phone entry point, floating above the tab bar. */
export function NewGroupFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Nuevo grupo"
      className="animate-fab-in fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-10 flex size-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-accent/35 ring-4 ring-surface transition-transform active:scale-90 md:hidden"
    >
      <PlusIcon className="size-6" />
    </button>
  );
}
