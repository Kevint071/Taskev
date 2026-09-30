"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  addDaysUtc,
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

const dayNameFormat = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Days a key moves the focus by; Home/End and PageUp/PageDown are handled apart. */
const ARROW_STEP: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

/** Same day of the month `delta` months away, clamped to that month's length. */
function shiftMonth(date: Date, delta: number): Date {
  const { year, month } = addMonths(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    delta,
  );
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return utcMidnight(year, month, Math.min(date.getUTCDate(), lastDay));
}

/**
 * Month grid with an optional shortcuts rail. The visual core of DateField.
 * The days are a single tab stop: arrows move by day and week, Home/End jump
 * to the week's ends and PageUp/PageDown change month.
 */
export function CalendarPanel({
  selected,
  onSelect,
  onClear,
  shortcuts,
  className = "",
  bodyClassName = "w-60",
  flat = false,
  focusOnMount = false,
}: {
  selected: Date | null;
  onSelect: (date: Date) => void;
  onClear?: () => void;
  shortcuts?: CalendarShortcut[];
  className?: string;
  /** Width of the month grid; `w-full` lets it fill a sheet. */
  bodyClassName?: string;
  /** Drops the floating shadow, for a panel that sits inline in the page. */
  flat?: boolean;
  /** Moves focus into the grid when the panel appears (popovers). */
  focusOnMount?: boolean;
}) {
  const today = todayUtcMidnight();
  const initial = selected ?? today;
  const [view, setView] = useState({
    year: initial.getUTCFullYear(),
    month: initial.getUTCMonth(),
  });
  // The day the keyboard last reached; it is the grid's tab stop while shown.
  const [cursor, setCursor] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // A day in another month, to focus once the view has moved there.
  const pendingFocus = useRef<string | null>(null);

  const grid = buildMonthGrid(view.year, view.month);

  const tabStop = (
    (cursor && grid.find((d) => d.date.toISOString() === cursor)) ||
    (selected &&
      grid.find((d) => d.inMonth && isSameUtcDay(d.date, selected))) ||
    grid.find((d) => d.inMonth && isSameUtcDay(d.date, today)) ||
    grid.find((d) => d.inMonth)
  )?.date.toISOString();

  function focusDay(iso: string) {
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-date="${iso}"]`)
      ?.focus();
  }

  // Only on mount: later renders must not steal focus.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only on purpose
  useEffect(() => {
    if (focusOnMount && tabStop) focusDay(tabStop);
  }, []);

  // After a keyboard move into another month, its day exists only once rendered.
  useEffect(() => {
    if (pendingFocus.current === null) return;
    focusDay(pendingFocus.current);
    pendingFocus.current = null;
  });

  function moveTo(date: Date) {
    const iso = date.toISOString();
    setCursor(iso);
    if (grid.some((d) => d.date.toISOString() === iso)) {
      focusDay(iso);
      return;
    }
    pendingFocus.current = iso;
    setView({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const iso = (event.target as HTMLElement)
      .closest<HTMLElement>("[data-date]")
      ?.getAttribute("data-date");
    if (!iso) return;
    const from = new Date(iso);
    const weekday = (from.getUTCDay() + 6) % 7; // Monday = 0
    let target: Date;
    if (event.key in ARROW_STEP)
      target = addDaysUtc(from, ARROW_STEP[event.key]);
    else if (event.key === "Home") target = addDaysUtc(from, -weekday);
    else if (event.key === "End") target = addDaysUtc(from, 6 - weekday);
    else if (event.key === "PageUp") target = shiftMonth(from, -1);
    else if (event.key === "PageDown") target = shiftMonth(from, 1);
    else return;
    event.preventDefault();
    moveTo(target);
  }

  return (
    <div
      className={`flex overflow-hidden rounded-panel border border-line bg-raised ${flat ? "" : "shadow-2xl shadow-black/10"} ${className}`}
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
                aria-pressed={active}
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
      <div className={`${bodyClassName} p-3`}>
        <div className="mb-2.5 flex items-center justify-between">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => setView((v) => addMonths(v.year, v.month, -1))}
            className="flex size-8 items-center justify-center rounded-control text-muted hover:bg-sunken hover:text-ink"
          >
            ‹
          </button>
          <span aria-live="polite" className="text-meta font-semibold text-ink">
            {formatMonthYear(utcMidnight(view.year, view.month, 1))}
          </span>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() => setView((v) => addMonths(v.year, v.month, 1))}
            className="flex size-8 items-center justify-center rounded-control text-muted hover:bg-sunken hover:text-ink"
          >
            ›
          </button>
        </div>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: delegates the arrow keys of its day buttons */}
        <div
          ref={gridRef}
          onKeyDown={handleGridKeyDown}
          className="grid grid-cols-7 gap-y-0.5"
        >
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: weekday labels repeat ("M" for both Tue/Wed) and never reorder
              key={i}
              // Each day button already names its weekday.
              aria-hidden="true"
              className="pb-1 text-center text-meta text-muted"
            >
              {label}
            </div>
          ))}
          {grid.map((d) => {
            const iso = d.date.toISOString();
            const isToday = isSameUtcDay(d.date, today);
            const isSelected = selected
              ? isSameUtcDay(d.date, selected)
              : false;
            return (
              <button
                key={iso}
                type="button"
                data-date={iso}
                tabIndex={iso === tabStop ? 0 : -1}
                aria-label={dayNameFormat.format(d.date)}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                onFocus={() => setCursor(iso)}
                onClick={() => onSelect(d.date)}
                className={`flex h-8 items-center justify-center rounded-control text-meta transition-colors hover:bg-sunken ${
                  d.inMonth ? "text-ink" : "text-muted"
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
