"use client";

import { type KeyboardEvent, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { THEME_OPTIONS } from "@/lib/theme";

export function ThemeToggle({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const groupRef = useRef<HTMLDivElement>(null);

  // A radio group is one tab stop; arrows move the choice and the focus.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const index = THEME_OPTIONS.findIndex((option) => option.value === theme);
    const next =
      THEME_OPTIONS[
        (index + step + THEME_OPTIONS.length) % THEME_OPTIONS.length
      ];
    setTheme(next.value);
    groupRef.current
      ?.querySelectorAll<HTMLElement>('[role="radio"]')
      [THEME_OPTIONS.indexOf(next)]?.focus();
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Tema"
      onKeyDown={handleKeyDown}
      className={`inline-flex rounded-control border border-line bg-sunken p-0.5 ${className}`}
    >
      {THEME_OPTIONS.map((option) => {
        const active = option.value === theme;
        return (
          // biome-ignore lint/a11y/useSemanticElements: segmented control styled as buttons
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => setTheme(option.value)}
            className={`flex-1 rounded-[4px] font-medium transition-colors ${
              compact ? "h-7 px-2 text-meta" : "h-8 px-3.5"
            } ${
              active
                ? "bg-raised text-ink shadow-sm shadow-black/10"
                : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
