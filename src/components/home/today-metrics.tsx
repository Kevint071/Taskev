"use client";

import {
  type CSSProperties,
  type ReactNode,
  useState,
  useSyncExternalStore,
} from "react";
import { CalendarIcon, CheckCircleIcon } from "@/components/ui/icons";
import { buildTodayMetrics, buildWeekActivity } from "@/lib/today";
import { useStickyCounts } from "./use-sticky-counts";

const noopSubscribe = () => () => {};

/** Smallest fill, as % of the track, so a single completion still shows. The busiest day fills it. */
const FILL_MIN_PCT = 6;

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

const STATS: {
  key: "completed" | "activeDays";
  tone: string;
  Icon: (props: { className?: string }) => ReactNode;
  label: (n: number) => string;
}[] = [
  {
    key: "completed",
    tone: "var(--status-done)",
    Icon: CheckCircleIcon,
    label: completedLabel,
  },
  {
    key: "activeDays",
    tone: "var(--status-progress)",
    Icon: CalendarIcon,
    label: (n) => (n === 1 ? "día activo" : "días activos"),
  },
];

/**
 * "Tu progreso": the week's completions and active days as a row of icon
 * counts, and their rhythm as one column per day. Completion dates are the viewer's calendar day stored as UTC
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
  const week = buildWeekActivity(dates, now);
  // The counts up top follow the selected day, else the whole week.
  const active = selected === null ? null : (week[selected] ?? null);
  const counts = {
    completed: active ? active.count : completedThisWeek,
    activeDays: active ? 0 : week.filter((day) => day.count > 0).length,
  };
  const shownCounts = useStickyCounts(counts);

  if (completedThisWeek === 0) return null;

  const lastIndex = week.length - 1;
  const peak = Math.max(...week.map((day) => day.count));

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-section font-semibold">Tu progreso</h2>

      <div>
        {/* Same row as "Actividad de hoy": stats with nothing to count collapse out instead of unmounting, so active days glide away while a single day is shown. */}
        <ul className="flex min-h-5 flex-wrap gap-y-2">
          {STATS.map((stat) => {
            const { Icon } = stat;
            const visible = counts[stat.key] > 0;
            const count = shownCounts[stat.key];
            return (
              <li
                key={stat.key}
                aria-hidden={!visible}
                className="tabular grid text-meta transition-[grid-template-columns,opacity] duration-300 ease-out"
                style={{
                  gridTemplateColumns: visible ? "1fr" : "0fr",
                  opacity: visible ? 1 : 0,
                }}
              >
                <span className="min-w-0 overflow-hidden whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 pr-5">
                    <span
                      aria-hidden="true"
                      className="inline-flex"
                      style={{ color: stat.tone }}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span key={count} className="animate-rise font-semibold">
                      {count}
                    </span>
                    <span className="relative text-muted">
                      <span aria-hidden="true" className="invisible">
                        {stat.label(2)}
                      </span>
                      <span className="absolute left-0">
                        {stat.label(count)}
                      </span>
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        {/* An empty day counts as no selection, so it reads as if nothing were hovered. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: only resets the hover readout; every column is a focusable button. */}
        <div
          className="mt-6"
          onMouseLeave={() => setSelected(null)}
          role="presentation"
        >
          <ol
            aria-label="Tareas completadas por día"
            className="flex h-36 gap-2"
          >
            {week.map((day, i) => {
              const fillPct =
                day.count === 0
                  ? 0
                  : Math.max(FILL_MIN_PCT, (day.count / peak) * 100);
              return (
                <li
                  key={day.dayKey}
                  className="flex min-w-0 flex-1 justify-center"
                >
                  <button
                    type="button"
                    aria-label={`${weekdayName.format(day.dayKey)}: ${day.count} ${completedLabel(day.count)}`}
                    onClick={() => setSelected(day.count > 0 ? i : null)}
                    onFocus={() => setSelected(day.count > 0 ? i : null)}
                    onMouseEnter={() => setSelected(day.count > 0 ? i : null)}
                    onMouseLeave={() => setSelected(null)}
                    className={`flex h-full w-7 flex-col items-center pt-7 rounded-lg outline-offset-2 transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-accent ${
                      selected !== null && selected !== i ? "opacity-35" : ""
                    }`}
                  >
                    {/* A thin full-height track, so empty days still hold their place, filled from the bottom. */}
                    <span
                      aria-hidden="true"
                      className="relative w-2.5 flex-1 rounded-full bg-line/70 md:w-3"
                    >
                      {day.count > 0 && (
                        <span
                          className={`animate-grow-y absolute inset-x-0 bottom-0 rounded-full bg-accent ${
                            i === lastIndex
                              ? "shadow-[0_0_14px_-2px_color-mix(in_srgb,var(--accent)_70%,transparent)]"
                              : ""
                          }`}
                          style={
                            {
                              height: `${fillPct}%`,
                              "--delay": `${i * 55}ms`,
                            } as CSSProperties
                          }
                        />
                      )}
                      {/* The hovered day's count floats over its bar, like the hour in "Actividad de hoy". It stays mounted so it can fade out as smoothly as it came in. */}
                      {day.count > 0 && (
                        <span
                          className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2"
                          style={{ bottom: `calc(${fillPct}% + 6px)` }}
                        >
                          <span
                            className={`tabular block whitespace-nowrap rounded-full border border-line/80 bg-raised/70 px-2 py-0.5 text-[0.75rem] font-semibold leading-4 text-accent shadow-[0_6px_16px_-6px_rgb(0_0_0/0.25)] backdrop-blur-md transition-[opacity,translate,scale] duration-200 ease-out ${
                              selected === i
                                ? ""
                                : "translate-y-1 scale-90 opacity-0"
                            }`}
                          >
                            {day.count}
                          </span>
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <ol aria-hidden="true" className="mt-3 flex gap-2">
            {week.map((day, i) => (
              <li
                key={day.dayKey}
                className={`min-w-0 flex-1 text-center text-[0.6875rem] font-medium uppercase leading-none tracking-wide ${i === lastIndex ? "text-accent" : "text-muted"}`}
              >
                {weekdayLetter.format(day.dayKey)}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
