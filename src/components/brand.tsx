/** Wordmark: a tick on a cobalt tile, then the name. */
export function Brand({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-body font-semibold tracking-tight ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-6 shrink-0"
        fill="none"
      >
        <rect
          x="2.5"
          y="2.5"
          width="19"
          height="19"
          rx="5.5"
          fill="var(--accent)"
        />
        <path
          d="M7 12.5l3 3 7-7"
          stroke="var(--accent-ink)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Taskev
    </span>
  );
}
