"use client";

import Link from "next/link";
import { type CSSProperties, useState, useSyncExternalStore } from "react";
import { CHIPS } from "@/components/activity/activity-summary";
import { ArrowRightIcon, FlameIcon } from "@/components/ui/icons";
import {
  type ActivityKind,
  type ActivitySummary,
  type HourActivity,
  hourlyActivity,
} from "@/lib/activity";

const noopSubscribe = () => () => {};

/** Height in px of the tallest column; the others scale against the busiest hour. */
const BAR_MAX_PX = 88;
const SEGMENT_MIN_PX = 3;
/** Above this many hours, the axis labels only every third one. */
const ALL_LABELS_UP_TO = 8;

/** Bottom-to-top order of the stacked segments. */
const STACK: ActivityKind[] = [
  "completed",
  "created",
  "notes",
  "statusChanges",
];

const KIND = Object.fromEntries(
  CHIPS.map((chip) => [chip.key, chip]),
) as Record<ActivityKind, (typeof CHIPS)[number]>;

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

function changesLabel(n: number) {
  return `${n} ${n === 1 ? "cambio" : "cambios"}`;
}

/**
 * "Actividad de hoy": the day's changes as a headline number, their makeup as a
 * row of icon counts and their rhythm as one stacked column per hour, with the
 * full feed one link away on its own page. Which hour it is depends on the
 * viewer's clock, so server render and hydration use the time zone cookie
 * (`timeZone`) and `serverNow`, then the browser recomputes from its own.
 * Tapping or hovering a column spells out what happened in that hour.
 */
export function TodayActivity({
  summary,
  events,
  serverNow,
  timeZone,
}: {
  summary: ActivitySummary;
  events: { at: string; kind: ActivityKind }[];
  serverNow: string;
  timeZone?: string;
}) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [selected, setSelected] = useState<number | null>(null);

  const hours = hourlyActivity(
    events.map((e) => ({ at: new Date(e.at), kind: e.kind })),
    hydrated ? new Date() : new Date(serverNow),
    hydrated ? undefined : timeZone,
  );
  const peak = Math.max(...hours.map((h) => h.total));
  const peakIndex = hours.findIndex((h) => h.total === peak);
  const shownIndex =
    selected !== null && hours[selected] ? selected : peakIndex;
  const shown = hours[shownIndex];
  // The breakdown up top follows the selected hour, else the whole day.
  const active = selected === null ? null : (hours[selected] ?? null);
  const counts = active ? active.counts : summary;
  const changes = active ? active.total : summary.changes;
  const labelEvery = hours.length <= ALL_LABELS_UP_TO ? 1 : 3;
  /** Places a floating label centred just above an hour's column. */
  const floatOver = (i: number): CSSProperties => ({
    left: `${((i + 0.5) / hours.length) * 100}%`,
    bottom: `${columnPx(hours[i], peak) + 6}px`,
  });

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-section font-semibold">Actividad de hoy</h2>
          <Link
            href="/actividad"
            className="group inline-flex shrink-0 items-center gap-1 text-ui font-medium text-accent"
          >
            Ver detalle
            <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <p className="tabular mt-1 text-meta text-muted">
          <span className="mr-1 font-semibold text-ink">{changes}</span>{" "}
          {changes === 1 ? "cambio" : "cambios"}
          {active
            ? ` a las ${hourLabel(active.hour)}`
            : ` en ${summary.tasks} ${summary.tasks === 1 ? "tarea" : "tareas"}`}
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-raised p-5 shadow-panel md:p-6">
        {/* Kinds with nothing to count collapse out of the row instead of unmounting, so the others glide into place as the selected hour changes. The row is never empty: the section needs changes to render and only hours with changes can be selected. */}
        <ul className="flex min-h-5 flex-wrap gap-y-2">
          {CHIPS.map((chip) => {
            const { Icon } = chip;
            const count = counts[chip.key];
            const shown = count > 0;
            return (
              <li
                key={chip.key}
                aria-hidden={!shown}
                className="tabular grid text-meta transition-[grid-template-columns,opacity] duration-300 ease-out"
                style={{
                  gridTemplateColumns: shown ? "1fr" : "0fr",
                  opacity: shown ? 1 : 0,
                }}
              >
                <span className="min-w-0 overflow-hidden whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 pr-5">
                    <span
                      aria-hidden="true"
                      className="inline-flex"
                      style={{ color: chip.tone }}
                    >
                      <Icon className="size-4" />
                    </span>
                    {/* Keyed by the count so a new number settles in instead of swapping silently. */}
                    <span key={count} className="animate-rise font-semibold">
                      {count}
                    </span>
                    {/* The plural sizes the label, so going to or from a single item doesn't shift what sits to its right. */}
                    <span className="relative text-muted">
                      <span aria-hidden="true" className="invisible">
                        {chip.label(2)}
                      </span>
                      <span className="absolute left-0">
                        {chip.label(count)}
                      </span>
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        {/* An empty hour counts as no selection, so it reads as if nothing were hovered. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: only resets the hover readout; every column is a focusable button. */}
        <div
          className="mt-6"
          onMouseLeave={() => setSelected(null)}
          role="presentation"
        >
          <div className="relative">
            <p aria-live="polite" className="sr-only">
              {selected === null ? "Hora más activa " : ""}
              {hourLabel(shown.hour)}
            </p>
            {/* At rest a lone flame marks the busiest hour; it fades while another hour is shown. */}
            <span
              aria-hidden="true"
              className="animate-rise pointer-events-none absolute z-10 -translate-x-1/2"
              style={
                {
                  ...floatOver(peakIndex),
                  "--delay": "600ms",
                } as CSSProperties
              }
            >
              <span
                className={`block transition-[opacity,scale] duration-200 ${
                  selected === null ? "" : "scale-75 opacity-0"
                }`}
              >
                <FlameIcon className="size-4" />
              </span>
            </span>
            {/* The hovered hour's time pops in over its column; keyed by the column so each new one animates in instead of moving across. */}
            {active && (
              <span
                key={shownIndex}
                aria-hidden="true"
                className="pointer-events-none absolute z-10 -translate-x-1/2"
                style={floatOver(shownIndex)}
              >
                <span className="tabular animate-rise block whitespace-nowrap rounded-full border border-line/80 bg-raised/70 px-2 py-0.5 text-[0.75rem] font-semibold leading-4 text-accent shadow-[0_6px_16px_-6px_rgb(0_0_0/0.25)] backdrop-blur-md">
                  {hourLabel(active.hour)}
                </span>
              </span>
            )}
            <ol
              aria-label="Cambios por hora"
              className="flex h-32 items-end gap-1 border-b border-line"
            >
              {hours.map((hour, i) => (
                <li key={hour.hour} className="h-full min-w-0 flex-1">
                  <button
                    type="button"
                    aria-label={`${hourLabel(hour.hour)}: ${changesLabel(hour.total)}`}
                    onClick={() => setSelected(hour.total > 0 ? i : null)}
                    onFocus={() => setSelected(hour.total > 0 ? i : null)}
                    onMouseEnter={() => setSelected(hour.total > 0 ? i : null)}
                    onMouseLeave={() => setSelected(null)}
                    className={`pointer-events-none flex h-full w-full items-end justify-center rounded-t-md outline-offset-2 transition-opacity focus-visible:outline-2 focus-visible:outline-accent ${
                      selected !== null && selected !== i ? "opacity-40" : ""
                    }`}
                  >
                    <HourColumn hour={hour} peak={peak} index={i} />
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <ol aria-hidden="true" className="mt-2 flex gap-1">
            {hours.map((hour, i) => (
              <li
                key={hour.hour}
                className={`min-w-0 flex-1 whitespace-nowrap text-center text-[0.75rem] leading-none ${
                  i === hours.length - 1
                    ? "font-semibold text-ink"
                    : "text-muted"
                }`}
              >
                {hour.hour % labelEvery === 0 || i === hours.length - 1
                  ? `${hour.hour}h`
                  : ""}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Height in px of one kind's segment within an hour's column. */
function segmentPx(count: number, peak: number) {
  return Math.max(SEGMENT_MIN_PX, (count / peak) * BAR_MAX_PX);
}

/** Height in px of an hour's whole column, 2px gaps between segments included. */
function columnPx(hour: HourActivity, peak: number) {
  const kinds = STACK.filter((kind) => hour.counts[kind] > 0);
  if (kinds.length === 0) return 2;
  return (
    kinds.reduce((sum, kind) => sum + segmentPx(hour.counts[kind], peak), 0) +
    (kinds.length - 1) * 2
  );
}

/** One hour's stack of segments, growing up from the baseline. */
function HourColumn({
  hour,
  peak,
  index,
}: {
  hour: HourActivity;
  peak: number;
  index: number;
}) {
  if (hour.total === 0) {
    return (
      <span
        aria-hidden="true"
        className="block h-0.5 w-full max-w-7 rounded-full bg-line"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="animate-grow-y pointer-events-auto flex w-full max-w-7 flex-col-reverse gap-0.5 overflow-hidden rounded-t-md"
      style={{ "--delay": `${index * 35}ms` } as CSSProperties}
    >
      {STACK.map((kind) =>
        hour.counts[kind] > 0 ? (
          <span
            key={kind}
            className="block w-full"
            style={{
              height: `${segmentPx(hour.counts[kind], peak)}px`,
              backgroundColor: KIND[kind].color,
            }}
          />
        ) : null,
      )}
    </span>
  );
}
