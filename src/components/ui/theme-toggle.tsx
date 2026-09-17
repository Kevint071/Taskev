"use client";

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

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
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
