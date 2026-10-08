"use client";

import Link from "next/link";
import {
  type CSSProperties,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { CHIPS } from "@/components/activity/activity-summary";
import { ArrowRightIcon, FlameIcon } from "@/components/ui/icons";
import {
  type ActivityKind,
  type ActivitySummary,
  type HourActivity,
  hourlyActivity,
} from "@/lib/activity";
import { useStickyCounts } from "./use-sticky-counts";

const MINUTE_MS = 60_000;

// The current minute, ticking while the page is open; null on the server.
function subscribeMinute(onTick: () => void) {
  const id = setInterval(onTick, MINUTE_MS / 4);
  return () => clearInterval(id);
}
const minuteSnapshot = () => Math.floor(Date.now() / MINUTE_MS);
const serverMinute = () => null;

/** Length of a roll into a new hour; matches `animate-roll-in`/`-out`. */
const ROLL_MS = 600;
/** Moves the floating marks along with the columns as the chart rolls. */
const ROLL_TRANSITION =
  "transition-[left,bottom] duration-600 ease-[cubic-bezier(0.22,1,0.36,1)]";

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
 * "Actividad de hoy": the day's changes as a row of icon counts and their rhythm as one stacked column per hour, with the
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
  const minute = useSyncExternalStore(
    subscribeMinute,
    minuteSnapshot,
    serverMinute,
  );
  // The selected hour of day, not its index, so it stays put as the chart rolls.
  const [selected, setSelected] = useState<number | null>(null);

  const hours = hourlyActivity(
    events.map((e) => ({ at: new Date(e.at), kind: e.kind })),
    minute === null ? new Date(serverNow) : new Date(minute * MINUTE_MS),
    minute === null ? timeZone : undefined,
  );
  const columns = useRollingHours(hours);
  const peak = Math.max(...hours.map((h) => h.total));
  const peakIndex = hours.findIndex((h) => h.total === peak);
  const selectedIndex = hours.findIndex((h) => h.hour === selected);
  const shownIndex = selectedIndex === -1 ? peakIndex : selectedIndex;
  const shown = hours[shownIndex];
  // The breakdown up top follows the selected hour, else the whole day.
  const active = selectedIndex === -1 ? null : hours[selectedIndex];
  const counts = active ? active.counts : summary;
  const shownCounts = useStickyCounts<ActivityKind>(counts);
  const labelEvery = hours.length <= ALL_LABELS_UP_TO ? 1 : 3;
  /** Places a floating label centred just above an hour's column. */
  const floatOver = (i: number): CSSProperties => ({
    left: `${((i + 0.5) / hours.length) * 100}%`,
    bottom: `${columnPx(hours[i], peak) + 6}px`,
  });

  return (
    <section className="flex min-w-0 flex-col gap-4">
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

      <div>
        {/* Kinds with nothing to count collapse out of the row instead of unmounting, so the others glide into place as the selected hour changes. The row is never empty: the section needs changes to render and only hours with changes can be selected. */}
        <ul className="flex min-h-5 flex-wrap gap-y-2">
          {CHIPS.map((chip) => {
            const { Icon } = chip;
            const shown = counts[chip.key] > 0;
            const count = shownCounts[chip.key];
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
          <div className="relative border-b border-line">
            <p aria-live="polite" className="sr-only">
              {active === null ? "Hora más activa " : ""}
              {hourLabel(shown.hour)}
            </p>
            {/* At rest a lone flame marks the busiest hour; it fades while another hour is shown. */}
            <span
              aria-hidden="true"
              className={`animate-rise pointer-events-none absolute z-10 -translate-x-1/2 ${ROLL_TRANSITION}`}
              style={
                {
                  ...floatOver(peakIndex),
                  "--delay": "600ms",
                } as CSSProperties
              }
            >
              <span
                className={`block transition-[opacity,scale] duration-200 ${
                  active === null ? "" : "scale-75 opacity-0"
                }`}
              >
                <FlameIcon className="size-4" />
              </span>
            </span>
            {/* The hovered hour's time floats over its column. One per active hour stays mounted, so each fades in and out in place instead of moving across or vanishing. */}
            {hours.map((hour, i) =>
              hour.total > 0 ? (
                <span
                  key={hour.hour}
                  aria-hidden="true"
                  className={`pointer-events-none absolute z-10 -translate-x-1/2 ${ROLL_TRANSITION}`}
                  style={floatOver(i)}
                >
                  <span
                    className={`tabular block whitespace-nowrap text-[0.75rem] font-semibold leading-4 text-accent transition-[opacity,translate,scale] duration-200 ease-out ${
                      selectedIndex === i
                        ? ""
                        : "translate-y-1 scale-90 opacity-0"
                    }`}
                  >
                    {hourLabel(hour.hour)}
                  </span>
                </span>
              ) : null,
            )}
            {/* Columns are spaced by padding, not a gap, so one rolling out of the window collapses all the way. */}
            <ol
              aria-label="Cambios por hora"
              className="-mx-0.5 flex h-32 items-end"
            >
              {columns.map(({ hour, roll }, i) => {
                const select = () =>
                  setSelected(hour.total > 0 ? hour.hour : null);
                return (
                  <li
                    key={hour.hour}
                    inert={roll === "out"}
                    className={`h-full min-w-0 flex-1 px-0.5 ${ROLL_CLASS[roll]}`}
                  >
                    <button
                      type="button"
                      aria-label={`${hourLabel(hour.hour)}: ${changesLabel(hour.total)}`}
                      onClick={select}
                      onFocus={select}
                      onMouseEnter={select}
                      onMouseLeave={() => setSelected(null)}
                      className={`pointer-events-none flex h-full w-full items-end justify-center rounded-t-md outline-offset-2 transition-opacity focus-visible:outline-2 focus-visible:outline-accent ${
                        active !== null && active.hour !== hour.hour
                          ? "opacity-40"
                          : ""
                      }`}
                    >
                      {/* A column rolling out keeps its scale, even if it held the old peak. */}
                      <HourColumn
                        hour={hour}
                        peak={Math.max(peak, hour.total)}
                        index={i}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <ol aria-hidden="true" className="-mx-0.5 mt-2 flex">
            {columns.map(({ hour, roll }) => {
              const isNow = hour === hours[hours.length - 1];
              return (
                <li
                  key={hour.hour}
                  className={`min-w-0 flex-1 whitespace-nowrap px-0.5 text-center text-[0.75rem] leading-none ${ROLL_CLASS[roll]} ${
                    isNow ? "font-semibold text-ink" : "text-muted"
                  }`}
                >
                  {hour.hour % labelEvery === 0 || isNow ? `${hour.hour}h` : ""}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

type Roll = "in" | "out" | "none";

const ROLL_CLASS: Record<Roll, string> = {
  in: "animate-roll-in overflow-hidden",
  out: "animate-roll-out overflow-hidden",
  none: "",
};

/**
 * The chart's hours, each tagged with how it is rolling. When the window
 * moves to a new hour, the hours that left it stay mounted for one roll so
 * they can collapse while the new ones widen in, instead of every column
 * jumping to its new width at once.
 */
function useRollingHours(
  hours: HourActivity[],
): { hour: HourActivity; roll: Roll }[] {
  const key = hours.map((h) => h.hour).join();
  const [prev, setPrev] = useState({ key, hours });
  const [leaving, setLeaving] = useState<HourActivity[]>([]);
  const [entering, setEntering] = useState<number[]>([]);

  // Adjusts state while rendering, so the first frame of a new hour already
  // has the old columns to collapse.
  if (prev.key !== key) {
    const before = new Set(prev.hours.map((h) => h.hour));
    const after = new Set(hours.map((h) => h.hour));
    setPrev({ key, hours });
    setLeaving(prev.hours.filter((h) => !after.has(h.hour)));
    setEntering(hours.filter((h) => !before.has(h.hour)).map((h) => h.hour));
  }

  useEffect(() => {
    if (leaving.length === 0 && entering.length === 0) return;
    const id = setTimeout(() => {
      setLeaving([]);
      setEntering([]);
    }, ROLL_MS);
    return () => clearTimeout(id);
  }, [leaving, entering]);

  return [
    ...leaving.map((hour) => ({ hour, roll: "out" as const })),
    ...hours.map((hour) => ({
      hour,
      roll: entering.includes(hour.hour) ? ("in" as const) : ("none" as const),
    })),
  ].sort((a, b) => a.hour.hour - b.hour.hour);
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
            className="block w-full transition-[height] duration-600 ease-[cubic-bezier(0.22,1,0.36,1)]"
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
