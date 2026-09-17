import { STATUS_LABELS, type Task } from "@/components/project-types";

export const STATUS_DOT: Record<Task["status"], string> = {
  disponible: "bg-status-open",
  en_curso: "bg-status-progress",
  bloqueada: "bg-status-blocked",
  completada: "bg-status-done",
};

export function StatusDot({ status }: { status: Task["status"] }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2 shrink-0 rounded-full ${STATUS_DOT[status]}`}
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
