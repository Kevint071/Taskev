import type { ReactNode } from "react";
import { SETTINGS_ICONS } from "@/components/settings-icons";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match: (path: string) => boolean;
};

const iconProps = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-4.5 shrink-0",
  "aria-hidden": "true" as const,
};

export const NAV: NavItem[] = [
  {
    href: "/",
    label: "Hoy",
    // Activity is a page under Hoy.
    match: (p) => p === "/" || p.startsWith("/actividad"),
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <circle cx="10" cy="10" r="3.2" />
        <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3" />
      </svg>
    ),
  },
  {
    href: "/groups",
    label: "Grupos",
    match: (p) => p.startsWith("/groups"),
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <rect x="3" y="3" width="6" height="6" rx="1.6" />
        <rect x="11" y="3" width="6" height="6" rx="1.6" />
        <rect x="3" y="11" width="6" height="6" rx="1.6" />
        <rect x="11" y="11" width="6" height="6" rx="1.6" />
      </svg>
    ),
  },
  {
    href: "/tasks",
    label: "Tareas",
    match: (p) => p.startsWith("/tasks"),
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="m3.5 5.5 1.4 1.4 2.4-2.6M3.5 13.5l1.4 1.4 2.4-2.6M10 6h6.5M10 14h6.5" />
      </svg>
    ),
  },
  {
    href: "/asistente",
    label: "Asistente",
    match: (p) => p.startsWith("/asistente"),
    icon: SETTINGS_ICONS.asistente,
  },
];
