import Link from "next/link";
import { BackIcon, PinIcon, TrashIcon } from "@/components/ui/icons";

/** Top row of a task page: back link, pin for today and, optionally, delete. */
export function TaskNavBar({
  back,
  pinned,
  onTogglePin,
  onDelete,
}: {
  /** Where the top-left arrow leads (usually the task's group). */
  back?: { href: string; label: string };
  pinned: boolean;
  onTogglePin: () => void;
  /** When provided, a delete action is offered. */
  onDelete?: () => void;
}) {
  const pinLabel = pinned
    ? "Quitar de las prioridades de hoy"
    : "Fijar para hoy";

  return (
    <div className="-mx-2 flex h-11 items-center justify-between">
      {back ? (
        <Link
          href={back.href}
          className="inline-flex h-11 min-w-0 items-center gap-0.5 rounded-[14px] pr-3 pl-1.5 text-ui font-medium text-muted transition-colors hover:text-ink"
        >
          <BackIcon />
          <span className="truncate">{back.label}</span>
        </Link>
      ) : (
        <span />
      )}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={pinned}
          aria-label={pinLabel}
          title={pinLabel}
          className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors ${
            pinned
              ? "text-accent hover:bg-accent-soft"
              : "text-muted hover:bg-sunken hover:text-ink"
          }`}
        >
          <PinIcon filled={pinned} className="size-4.5" />
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Eliminar tarea"
            title="Eliminar tarea"
            className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <TrashIcon className="size-4.5" />
          </button>
        )}
      </div>
    </div>
  );
}
