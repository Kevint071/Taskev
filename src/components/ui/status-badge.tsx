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
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
      title={title}
      className={`inline-block shrink-0 rounded-full ${className} ${STATUS_DOT[status]}`}
    />
  );
}

/**
 * Status and progress in one 16px glyph, for dense lists: an empty ring when
 * available, a ring with a growing pie while in progress, bars when paused,
 * a dash when blocked and a filled check once done. Colour is confined to
 * this small mark, so a list of them stays quiet.
 */
export function StatusIcon({
  status,
  progressPct,
  className = "size-4",
}: {
  status: Task["status"];
  progressPct: number;
  className?: string;
}) {
  const tone = STATUS_TONE[status];
  const label =
    status === "en_curso" && progressPct > 0
      ? `${STATUS_LABELS[status]}, ${progressPct} %`
      : STATUS_LABELS[status];

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 16 16"
      fill="none"
      className={`shrink-0 ${className}`}
    >
      <title>{label}</title>
      {status === "completada" ? (
        <>
          <circle cx="8" cy="8" r="7" fill={tone} />
          <path
            d="M5 8.2l2.1 2.1L11 6"
            stroke="var(--accent-ink)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <circle cx="8" cy="8" r="6.25" stroke={tone} strokeWidth="1.5" />
          {status === "en_curso" ? (
            <circle
              cx="8"
              cy="8"
              r="2.25"
              stroke={tone}
              strokeWidth="4.5"
              pathLength="100"
              strokeDasharray={`${progressPct} 100`}
              transform="rotate(-90 8 8)"
            />
          ) : null}
          {status === "pausada" ? (
            <path
              d="M6.25 5.75v4.5M9.75 5.75v4.5"
              stroke={tone}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ) : null}
          {status === "bloqueada" ? (
            <path
              d="M5.5 8h5"
              stroke={tone}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ) : null}
        </>
      )}
    </svg>
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
