"use client";

import { type CSSProperties, useState, useSyncExternalStore } from "react";
import { buildTodayMetrics, buildWeekActivity } from "@/lib/today";

const noopSubscribe = () => () => {};

/** Height in px of the tallest bar; the others scale against the busiest day. */
const BAR_MAX_PX = 84;
const BAR_MIN_PX = 8;

const weekdayLetter = new Intl.DateTimeFormat("es", {
  weekday: "narrow",
  timeZone: "UTC",
});
const weekdayName = new Intl.DateTimeFormat("es", {
  weekday: "long",
  timeZone: "UTC",
});

function completedLabel(n: number) {
  return n === 1 ? "completada" : "completadas";
}

/**
 * "Tu progreso": the week's completions as one number and one column per day
 * so it reads against each day. Completion dates are the viewer's calendar day stored as UTC
 * midnight, so "today" must come from the browser's clock: the server (UTC on
 * Vercel) is already on the next day during the viewer's evening. Server render
 * and hydration use `serverNow`, then the browser recomputes. Tapping or
 * hovering a column spells out that day. Nothing is shown until something was
 * completed this week.
 */
export function TodayMetrics({
  completedAt,
  serverNow,
}: {
  completedAt: string[];
  serverNow: string;
}) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [selected, setSelected] = useState<number | null>(null);

  const now = hydrated ? new Date() : new Date(serverNow);
  const dates = completedAt.map((d) => new Date(d));
  const { completedThisWeek } = buildTodayMetrics(dates, now);

  if (completedThisWeek === 0) return null;

  const week = buildWeekActivity(dates, now);
  const lastIndex = week.length - 1;
  const peak = Math.max(...week.map((day) => day.count));
  const peakIndex = week.findIndex((day) => day.count === peak);
  const shown = week[selected ?? peakIndex] ?? week[peakIndex];
  const shownName = weekdayName.format(shown.dayKey);

  // The breakdown up top follows the selected day, else today.
  const focusIndex = selected ?? lastIndex;
  const focus = week[focusIndex] ?? week[lastIndex];
  const focusLabel =
    focusIndex === lastIndex ? "hoy" : weekdayName.format(focus.dayKey);

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div>
        <h2 className="text-section font-semibold">Tu progreso</h2>
        <p className="tabular mt-1 text-meta text-muted">
          {selected === null ? (
            <>
              <span className="mr-1 font-semibold text-ink">
                {completedThisWeek}
              </span>{" "}
              {completedLabel(completedThisWeek)} en los últimos 7 días
            </>
          ) : (
            <>
              <span className="mr-1 font-semibold text-ink">{focus.count}</span>{" "}
              {completedLabel(focus.count)}{" "}
              {selected === lastIndex ? "hoy" : `el ${focusLabel}`}
            </>
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-raised p-5 shadow-panel md:p-6">
        {/* An empty day counts as no selection, so it reads as if nothing were hovered. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: only resets the hover readout; every column is a focusable button. */}
        <div
          className="mt-1"
          onMouseLeave={() => setSelected(null)}
          role="presentation"
        >
          <ol
            aria-label="Tareas completadas por día"
            className="flex h-28 items-end gap-2 border-b border-line"
          >
            {week.map((day, i) => {
              const isToday = i === lastIndex;
              const barPx =
                day.count === 0
                  ? 0
                  : Math.max(BAR_MIN_PX, (day.count / peak) * BAR_MAX_PX);
              return (
                <li key={day.dayKey} className="h-full min-w-0 flex-1">
                  <button
                    type="button"
                    aria-label={`${weekdayName.format(day.dayKey)}: ${day.count} ${completedLabel(day.count)}`}
                    onClick={() => setSelected(day.count > 0 ? i : null)}
                    onFocus={() => setSelected(day.count > 0 ? i : null)}
                    onMouseEnter={() => setSelected(day.count > 0 ? i : null)}
                    className={`group flex h-full w-full flex-col items-center justify-end gap-1.5 rounded-t-md outline-offset-2 transition-opacity focus-visible:outline-2 focus-visible:outline-accent ${
                      selected !== null && selected !== i ? "opacity-40" : ""
                    }`}
                  >
                    {day.count === 0 ? (
                      <span
                        aria-hidden="true"
                        className="mb-1 block size-1.5 rounded-full bg-line-strong"
                      />
                    ) : (
                      <>
                        <span
                          aria-hidden="true"
                          className={`animate-rise tabular text-[0.8125rem] font-semibold leading-none transition-colors ${isToday || selected === i ? "text-accent" : "text-ink"}`}
                          style={
                            { "--delay": `${i * 55 + 250}ms` } as CSSProperties
                          }
                        >
                          {day.count}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`animate-grow-y block w-full max-w-9 rounded-t-lg bg-linear-to-t transition-[translate,box-shadow] duration-300 group-hover:-translate-y-0.5 ${
                            isToday || selected === i
                              ? "from-accent to-accent/75 shadow-[0_6px_16px_-6px_var(--accent)]"
                              : "from-accent/60 to-accent/40"
                          }`}
                          style={
                            {
                              height: `${barPx}px`,
                              "--delay": `${i * 55}ms`,
                            } as CSSProperties
                          }
                        />
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          <ol aria-hidden="true" className="mt-2 flex gap-2">
            {week.map((day, i) => (
              <li
                key={day.dayKey}
                className={`min-w-0 flex-1 text-center text-[0.75rem] leading-none ${i === lastIndex ? "font-semibold text-ink" : "text-muted"}`}
              >
                {weekdayLetter.format(day.dayKey)}
              </li>
            ))}
          </ol>
        </div>

        <p
          aria-live="polite"
          className="tabular mt-4 min-h-4.5 text-meta text-muted"
        >
          <span className="font-semibold text-ink first-letter:uppercase">
            {selected === null
              ? `Mejor día ${shownName}`
              : selected === lastIndex
                ? "Hoy"
                : shownName}
          </span>
        </p>
      </div>
    </section>
  );
}
