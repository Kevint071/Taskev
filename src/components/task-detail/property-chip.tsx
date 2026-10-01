import type { CSSProperties, ReactNode } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

/**
 * One property of the task as a pill under the title, tinted by `tone` when
 * it has one. Opens its sheet when tapped.
 */
export function PropertyChip({
  icon,
  tone,
  label,
  appearance = "default",
  expanded,
  onClick,
  children,
}: {
  icon: ReactNode;
  /** CSS color the pill's background, border and icon are mixed from. */
  tone?: string;
  appearance?: "default" | "quiet" | "select";
  /** Accessible name, since the visible text is only the value. */
  label: string;
  /** Set when the chip opens a dropdown menu instead of a sheet. */
  expanded?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-haspopup={expanded === undefined ? "dialog" : "true"}
      aria-expanded={expanded}
      aria-label={label}
      onClick={onClick}
      style={tone ? ({ "--chip": tone } as CSSProperties) : undefined}
      className={`inline-flex h-9 max-w-full items-center gap-2 rounded-full border text-ui font-medium whitespace-nowrap transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] ${
        appearance === "quiet"
          ? "border-transparent bg-transparent pr-2.5 pl-0 text-muted hover:bg-sunken/70 hover:text-ink [&>svg]:text-muted"
          : appearance === "select"
            ? "border-transparent bg-transparent pr-3 pl-0 text-ink hover:bg-sunken/60 [&>svg]:text-(--chip)"
            : tone
              ? "border-[color-mix(in_srgb,var(--chip)_28%,transparent)] bg-[color-mix(in_srgb,var(--chip)_12%,var(--raised))] pr-3.5 pl-0 hover:bg-[color-mix(in_srgb,var(--chip)_20%,var(--raised))] [&>svg]:text-(--chip)"
              : "border-line bg-raised pr-3.5 pl-0 shadow-panel hover:border-line-strong hover:bg-sunken/60 [&>svg]:text-muted"
      }`}
    >
      {icon}
      {children}
      {appearance === "select" && (
        <ChevronDownIcon className="size-3.5 shrink-0 text-muted" />
      )}
    </button>
  );
}
