"use client";

import { useState } from "react";
import {
  addMonths,
  buildMonthGrid,
  formatMonthYear,
  isSameUtcDay,
  todayUtcMidnight,
  utcMidnight,
  WEEKDAY_LABELS,
} from "@/lib/calendar";

export type CalendarShortcut = {
  key: string;
  label: string;
  /** `null` means "clear" — only meaningful for optional dates. */
  date: Date | null;
};

/** Month grid with an optional shortcuts rail. The visual core of DateField. */
export function CalendarPanel({
  selected,
  onSelect,
  onClear,
  shortcuts,
  className = "",
}: {
  selected: Date | null;
  onSelect: (date: Date) => void;
  onClear?: () => void;
  shortcuts?: CalendarShortcut[];
  className?: string;
}) {
  const today = todayUtcMidnight();
  const initial = selected ?? today;
  const [view, setView] = useState({
    year: initial.getUTCFullYear(),
    month: initial.getUTCMonth(),
  });

  const grid = buildMonthGrid(view.year, view.month);

  return (
    <div
      className={`flex overflow-hidden rounded-panel border border-line bg-raised shadow-2xl shadow-black/10 ${className}`}
    >
      {shortcuts && shortcuts.length > 0 && (
        <div className="flex w-28 shrink-0 flex-col gap-0.5 border-r border-line bg-surface p-2">
          {shortcuts.map((s) => {
            const active = s.date
              ? selected !== null && isSameUtcDay(s.date, selected)
              : selected === null;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => (s.date ? onSelect(s.date) : onClear?.())}
                className={`rounded-control px-2 py-1.5 text-left text-meta transition-colors hover:bg-sunken ${
                  active ? "bg-accent-soft font-medium text-accent" : "text-ink"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="w-60 p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => setView((v) => addMonths(v.year, v.month, -1))}
            className="flex size-6 items-center justify-center rounded-control text-muted hover:bg-sunken hover:text-ink"
          >
            ‹
          </button>
          <span className="text-meta font-semibold text-ink">
            {formatMonthYear(utcMidnight(view.year, view.month, 1))}
          </span>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() => setView((v) => addMonths(v.year, v.month, 1))}
            className="flex size-6 items-center justify-center rounded-control text-muted hover:bg-sunken hover:text-ink"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {WEEKDAY_LABELS.map((label, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: weekday labels repeat ("M" for both Tue/Wed) and never reorder
            <div key={i} className="pb-1 text-center text-meta text-muted">
              {label}
            </div>
          ))}
          {grid.map((d) => {
            const isToday = isSameUtcDay(d.date, today);
            const isSelected = selected
              ? isSameUtcDay(d.date, selected)
              : false;
            return (
              <button
                key={d.date.toISOString()}
                type="button"
                onClick={() => onSelect(d.date)}
                className={`flex h-8 items-center justify-center rounded-control text-meta transition-colors hover:bg-sunken ${
                  d.inMonth ? "text-ink" : "text-muted/40"
                } ${
                  isToday && !isSelected
                    ? "font-semibold text-accent ring-1 ring-accent ring-inset"
                    : ""
                } ${
                  isSelected
                    ? "bg-accent font-semibold text-accent-ink hover:bg-accent"
                    : ""
                }`}
              >
                {d.day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
