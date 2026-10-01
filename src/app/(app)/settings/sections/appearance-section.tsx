"use client";

import { useTheme } from "@/components/theme-provider";
import { CheckIcon } from "@/components/ui/icons";
import { THEME_OPTIONS } from "@/lib/theme";
import { Card, CardHeader } from "./settings-card";
import { ThemePreview } from "./theme-preview";

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader
        title="Tema"
        description="Elige cómo se ve Taskev en este dispositivo."
      />
      <fieldset className="grid grid-cols-3 gap-3 p-5 sm:gap-4">
        <legend className="sr-only">Tema</legend>
        {THEME_OPTIONS.map((option) => {
          const selected = option.value === theme;
          return (
            <label
              key={option.value}
              className="group flex cursor-pointer flex-col gap-2"
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={selected}
                onChange={() => setTheme(option.value)}
                className="peer sr-only"
              />
              <span
                className={`relative block aspect-4/3 overflow-hidden rounded-xl border-2 transition-all peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
                  selected
                    ? "border-accent shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_16%,transparent)]"
                    : "border-line group-hover:border-line-strong"
                }`}
              >
                <ThemePreview theme={option.value} />
                {selected ? (
                  <span className="animate-fab-in absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm">
                    <CheckIcon className="size-3.5" />
                  </span>
                ) : null}
              </span>
              <span
                className={`text-center font-medium sm:text-left ${
                  selected ? "text-ink" : "text-muted"
                }`}
              >
                {option.label}
              </span>
            </label>
          );
        })}
      </fieldset>
      <p className="border-t border-line bg-sunken/60 px-5 py-3 text-meta text-muted">
        «Sistema» cambia solo entre claro y oscuro según tu dispositivo.
      </p>
    </Card>
  );
}
