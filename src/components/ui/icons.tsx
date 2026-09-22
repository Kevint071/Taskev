import type { CSSProperties } from "react";
import { useId } from "react";

export function PlusIcon({ className }: { className?: string } = {}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className ?? "size-4"}
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

export function ProgressGaugeIcon({ className }: { className?: string }) {
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
      <path d="M3 14.5A7 7 0 0 1 17 14.5" />
      <path d="M10 14.5V8" />
      <path d="M10 8l3-2" />
    </svg>
  );
}

export function TriangleAlertIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-4"}`}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 2.5 18 17H2Z" />
      <path d="M10 8v3.5" />
      <circle cx="10" cy="14" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LockIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-4"}`}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="9" width="12" height="8" rx="1.5" />
      <path d="M6.5 9V6a3.5 3.5 0 0 1 7 0" />
    </svg>
  );
}

export function RefreshIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-4"}`}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9.5A6 6 0 0 1 15.3 6.8M16 3.5v3.3h-3.3" />
      <path d="M16 10.5A6 6 0 0 1 4.7 13.2M4 16.5v-3.3h3.3" />
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
        d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248Z"
      />
      <path
        fill={`url(#${innerId})`}
        d="M15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.135.998a5.982 5.982 0 0 1-.443-2.058c0-1.834 1.153-3.404 2.774-4.023a3.752 3.752 0 0 1 2.847 6.255Z"
      />
    </svg>
  );
}

export function MinusIcon({ className }: { className?: string } = {}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className ?? "size-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4.5 10h11" />
    </svg>
  );
}

export function BackIcon({ className }: { className?: string } = {}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-5"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12.5 4-6 6 6 6" />
    </svg>
  );
}

export function MoreIcon({ className }: { className?: string } = {}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-5"}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="4.5" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="15.5" cy="10" r="1.5" />
    </svg>
  );
}

export function SendIcon({ className }: { className?: string } = {}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-5"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 16V4.5M5 9.5l5-5 5 5" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: { className?: string } = {}) {
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
      <path d="m8 5.5 4.5 4.5L8 14.5" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: { className?: string } = {}) {
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
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

export function FlagIcon({ className }: { className?: string }) {
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
      <path d="M5 17V3.5" />
      <path d="M5 4.5h9.5l-2 3.25 2 3.25H5" />
    </svg>
  );
}

export function CloseIcon({ className }: { className?: string } = {}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-4"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: { className?: string } = {}) {
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
      <path d="m5.5 8 4.5 4.5L14.5 8" />
    </svg>
  );
}

export function TrashIcon({ className }: { className?: string } = {}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-4"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" />
    </svg>
  );
}

/** A thumbtack: outline normally, filled solid once pinned. */
export function PinIcon({
  className,
  filled = false,
}: {
  className?: string;
  filled?: boolean;
} = {}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-4"}`}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        d="M8 3.5h4l.4 5.2 2.3 2.1a1 1 0 0 1-.68 1.73H6.98a1 1 0 0 1-.68-1.73l2.3-2.1L8 3.5Z"
      />
      <path strokeLinecap="round" d="M10 12.7V17" />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string } = {}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-4"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.2 13.2 3.3 3.3" />
    </svg>
  );
}

export function FilterIcon({ className }: { className?: string } = {}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-4"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 5h14M6 10h8M8.5 15h3" />
    </svg>
  );
}
