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
        d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248Z"
      />
      <path
        fill={`url(#${innerId})`}
        d="M15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.135.998a5.982 5.982 0 0 1-.443-2.058c0-1.834 1.153-3.404 2.774-4.023a3.752 3.752 0 0 1 2.847 6.255Z"
      />
    </svg>
  );
}
