"use client";

import Link from "next/link";
import { type CSSProperties, useState, useSyncExternalStore } from "react";
import { CHIPS } from "@/components/activity/activity-summary";
import { ArrowRightIcon } from "@/components/ui/icons";
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
 * proportional bar and their rhythm as one stacked column per hour, with the
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
  const shown = hours[selected ?? peakIndex] ?? hours[peakIndex];
  // The breakdown up top follows the selected hour, else the whole day.
  const active = selected === null ? null : (hours[selected] ?? null);
  const counts = active ? active.counts : summary;
  const changes = active ? active.total : summary.changes;
  const chips = CHIPS.filter((chip) => counts[chip.key] > 0);
  const labelEvery = hours.length <= ALL_LABELS_UP_TO ? 1 : 3;

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
        <div
          aria-hidden="true"
          className="h-2 overflow-hidden rounded-full bg-sunken"
        >
          {/* Every kind stays mounted so its width, gap included, animates as the selected hour changes; the negative margin clips the last segment's trailing gap. */}
          <div className="-mr-0.5 flex h-full">
            {STACK.map((kind) => (
              <span
                key={kind}
                className="block h-full basis-0 transition-[flex-grow,min-width,margin-right] duration-500 ease-out"
                style={{
                  flexGrow: counts[kind],
                  minWidth: counts[kind] > 0 ? 4 : 0,
                  marginRight: counts[kind] > 0 ? 2 : 0,
                  backgroundColor: KIND[kind].color,
                }}
              />
            ))}
          </div>
        </div>
        <ul className="mt-3 flex min-h-4.5 flex-wrap gap-x-4 gap-y-1.5">
          {chips.length === 0 && (
            <li className="text-meta text-muted">Sin cambios</li>
          )}
          {chips.map((chip) => (
            <li
              key={chip.key}
              className="tabular inline-flex items-center gap-2 text-meta"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: chip.color }}
              />
              <span className="font-semibold">{counts[chip.key]}</span>
              <span className="text-muted">{chip.label(counts[chip.key])}</span>
            </li>
          ))}
        </ul>

        {/* An empty hour counts as no selection, so it reads as if nothing were hovered. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: only resets the hover readout; every column is a focusable button. */}
        <div
          className="mt-6"
          onMouseLeave={() => setSelected(null)}
          role="presentation"
        >
          <ol
            aria-label="Cambios por hora"
            className="flex h-28 items-end gap-1 border-b border-line"
          >
            {hours.map((hour, i) => (
              <li key={hour.hour} className="h-full min-w-0 flex-1">
                <button
                  type="button"
                  aria-label={`${hourLabel(hour.hour)}: ${changesLabel(hour.total)}`}
                  onClick={() => setSelected(hour.total > 0 ? i : null)}
                  onFocus={() => setSelected(hour.total > 0 ? i : null)}
                  onMouseEnter={() => setSelected(hour.total > 0 ? i : null)}
                  className={`flex h-full w-full items-end justify-center rounded-t-md outline-offset-2 transition-opacity focus-visible:outline-2 focus-visible:outline-accent ${
                    selected !== null && selected !== i ? "opacity-40" : ""
                  }`}
                >
                  <HourColumn hour={hour} peak={peak} index={i} />
                </button>
              </li>
            ))}
          </ol>
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

        <p
          aria-live="polite"
          className="tabular mt-4 min-h-4.5 text-meta text-muted"
        >
          <span className="font-semibold text-ink">
            {selected === null ? "Hora más activa " : ""}
            {hourLabel(shown.hour)}
          </span>
        </p>
      </div>
    </section>
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
      className="animate-grow-y flex w-full max-w-7 flex-col-reverse gap-0.5 overflow-hidden rounded-t-md"
      style={{ "--delay": `${index * 35}ms` } as CSSProperties}
    >
      {STACK.map((kind) =>
        hour.counts[kind] > 0 ? (
          <span
            key={kind}
            className="block w-full"
            style={{
              height: `${Math.max(SEGMENT_MIN_PX, (hour.counts[kind] / peak) * BAR_MAX_PX)}px`,
              backgroundColor: KIND[kind].color,
            }}
          />
        ) : null,
      )}
    </span>
  );
}
