import type { CSSProperties, ReactNode } from "react";
import type { SettingsTab } from "@/lib/settings-tabs";

const iconProps = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-[18px] shrink-0",
  "aria-hidden": "true" as const,
};

export const SETTINGS_ICONS: Record<SettingsTab, ReactNode> = {
  perfil: (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="10" cy="7" r="3" />
      <path d="M4 16.5c.8-2.6 3.2-4.2 6-4.2s5.2 1.6 6 4.2" />
    </svg>
  ),
  apariencia: (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 3.5v13a6.5 6.5 0 0 0 0-13Z" fill="currentColor" />
    </svg>
  ),
  seguridad: (
    <svg {...iconProps} aria-hidden="true">
      <path d="M10 2.8 4.5 5v4.6c0 3.4 2.3 6.2 5.5 7.6 3.2-1.4 5.5-4.2 5.5-7.6V5Z" />
      <path d="m7.6 10 1.7 1.7 3.2-3.4" />
    </svg>
  ),
  asistente: (
    <svg {...iconProps} aria-hidden="true">
      <path d="M9 3.5 10.4 7.6 14.5 9 10.4 10.4 9 14.5 7.6 10.4 3.5 9 7.6 7.6Z" />
      <path d="M15 3v3M13.5 4.5h3M15.5 13.5v2.5M14.25 14.75h2.5" />
    </svg>
  ),
  cuenta: (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="10" cy="10" r="2.4" />
      <path d="M10 2.8v1.8M10 15.4v1.8M17.2 10h-1.8M4.6 10H2.8M15.1 4.9l-1.3 1.3M6.2 13.8l-1.3 1.3M15.1 15.1l-1.3-1.3M6.2 6.2 4.9 4.9" />
    </svg>
  ),
};

/** Each section keeps one tone, tinting its icon tile everywhere it appears. */
const SETTINGS_TONES: Record<SettingsTab, string> = {
  perfil: "var(--accent)",
  apariencia: "var(--status-paused)",
  seguridad: "var(--status-done)",
  asistente: "var(--status-progress)",
  cuenta: "var(--status-open)",
};

export function SettingsIconTile({
  tab,
  className = "size-9 rounded-xl",
}: {
  tab: SettingsTab;
  className?: string;
}) {
  return (
    <span
      style={{ "--tone": SETTINGS_TONES[tab] } as CSSProperties}
      className={`flex shrink-0 items-center justify-center bg-[color-mix(in_srgb,var(--tone)_14%,var(--raised))] text-(--tone) ${className}`}
    >
      {SETTINGS_ICONS[tab]}
    </span>
  );
}
