import { useId } from "react";

export function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string } = {}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`size-4 shrink-0 ${className ?? ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`size-4 shrink-0 ${className ?? "text-muted"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4.5" width="14" height="12" rx="2" />
      <path d="M3 8h14M6.5 3v3M13.5 3v3" />
    </svg>
  );
}

export function FlameIcon({ className }: { className?: string } = {}) {
  const id = useId();
  const outerId = `${id}-flame-outer`;
  const innerId = `${id}-flame-inner`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className ?? "size-5"}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={outerId}
          x1="9"
          y1="2"
          x2="15.5"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f97316" />
          <stop offset="0.55" stopColor="#ea580c" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient
          id={innerId}
          x1="11"
          y1="10"
          x2="13.5"
          y2="19"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="0.6" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${outerId})`}
        d="M12.6 1.7c.9 2.9.4 4.9-1 6.8-1.5 2-3.1 3.6-3.1 6.2 0 3.5 2.6 6.3 6 6.3 3.6 0 6.4-2.9 6.4-6.6 0-2.5-1.1-4.5-2.5-6.1.1 1.9-.8 3.2-2.1 4-.1-2.6-1.5-4.7-3.7-6.6Z"
      />
      <path
        fill={`url(#${innerId})`}
        d="M12.3 9.9c1.5 1.9 2.4 3.5 2.4 5.4a2.9 2.9 0 0 1-5.8 0c0-1.4.7-2.5 1.5-3.5-.1.9.2 1.6.8 2-.2-1.5.2-2.8 1.1-3.9Z"
      />
    </svg>
  );
}
