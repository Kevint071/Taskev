import { STATUS_LABELS, type Task } from "@/components/group-types";

export const STATUS_DOT: Record<Task["status"], string> = {
  disponible: "bg-status-open",
  en_curso: "bg-status-progress",
  bloqueada: "bg-status-blocked",
  pausada: "bg-status-paused",
  completada: "bg-status-done",
};

/** CSS color of each status, for tinting a surface with `color-mix`. */
export const STATUS_TONE: Record<Task["status"], string> = {
  disponible: "var(--status-open)",
  en_curso: "var(--status-progress)",
  bloqueada: "var(--status-blocked)",
  pausada: "var(--status-paused)",
  completada: "var(--status-done)",
};

export function StatusDot({
  status,
  className = "size-2",
  title,
}: {
  status: Task["status"];
  className?: string;
  title?: string;
}) {
  return (
    <span
      aria-hidden={title ? undefined : true}
      aria-label={title}
      title={title}
      className={`inline-block shrink-0 rounded-full ${className} ${STATUS_DOT[status]}`}
    />
  );
}

export function StatusBadge({ status }: { status: Task["status"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-meta text-muted">
      <StatusDot status={status} />
      {STATUS_LABELS[status]}
    </span>
  );
}
