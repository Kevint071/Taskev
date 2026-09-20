"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { STATUS_LABELS, type Task } from "@/components/project-types";
import { CalendarPanel } from "@/components/ui/calendar-panel";
import { CheckIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { STATUS_TONE, StatusDot } from "@/components/ui/status-badge";
import {
  addDaysUtc,
  daysBetweenUtc,
  isSameUtcDay,
  nextMondayUtc,
  todayUtcMidnight,
} from "@/lib/calendar";
import { formatDueDateWithWeekday, formatPriority } from "@/lib/format";
import {
  blockedFromDisponible,
  canCompleteAtProgress,
  PROGRESS_MAX,
  PROGRESS_MIN,
  PROGRESS_STEP,
} from "@/lib/progress";

const pillClass =
  "inline-flex h-8 shrink-0 items-center rounded-full border border-line-strong bg-raised px-3 text-meta font-medium transition-colors hover:bg-surface";

const stepButtonClass =
  "flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised text-ink transition-colors hover:bg-surface";

const weekdayFormat = new Intl.DateTimeFormat("es", {
  weekday: "short",
  timeZone: "UTC",
});

/* ---------------------------------------------------------------- Avance */

/** Drag or tap along the track; it snaps to each progress step, tinted by the status. */
export function ProgressSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="range"
      aria-label="Avance"
      min={PROGRESS_MIN}
      max={PROGRESS_MAX}
      step={PROGRESS_STEP}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ "--p": value / PROGRESS_MAX } as CSSProperties}
      className="progress-slider"
    />
  );
}

/* ----------------------------------------------------------------- Estado */

const STATUS_ORDER = Object.keys(STATUS_LABELS) as Task["status"][];

/** Why a status can't be picked right now, or null when it can. */
function lockReason(
  status: Task["status"],
  progressPct: number,
  completedAt: string | null,
): string | null {
  if (status === "disponible") {
    const blocked = blockedFromDisponible(progressPct, completedAt);
    if (blocked === "progress") {
      return "Disponible vuelve al bajar el avance a 0 %.";
    }
    if (blocked === "completedAt") {
      return "Disponible vuelve tras pasar por otro estado.";
    }
  }
  if (status === "completada" && !canCompleteAtProgress(progressPct)) {
    return `Completada se desbloquea al llegar a 100 % (falta ${PROGRESS_MAX - progressPct} %).`;
  }
  return null;
}

/**
 * The five statuses as a single-choice list. A status that can't be picked yet
 * stays dimmed and says why right under its name, since the sheet covers the toasts.
 */
export function StatusOptions({
  status,
  progressPct,
  completedAt,
  onPick,
}: {
  status: Task["status"];
  progressPct: number;
  completedAt: string | null;
  onPick: (status: Task["status"]) => void;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-0.5 border-0 p-0">
      <legend className="sr-only">Estado</legend>
      {STATUS_ORDER.map((s) => {
        const current = status === s;
        const reason = current ? null : lockReason(s, progressPct, completedAt);
        return (
          <button
            key={s}
            type="button"
            aria-pressed={current}
            disabled={reason !== null}
            onClick={() => onPick(s)}
            style={{ "--tone": STATUS_TONE[s] } as CSSProperties}
            className={`flex min-h-13 items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors ${
              current
                ? "bg-[color-mix(in_srgb,var(--tone)_13%,var(--raised))]"
                : "enabled:hover:bg-sunken"
            } ${reason ? "cursor-not-allowed" : ""}`}
          >
            <span className={reason ? "opacity-50" : ""}>
              <StatusDot status={s} />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-[15px] leading-6 ${
                  current ? "font-semibold" : "font-medium"
                } ${reason ? "text-muted/70" : ""}`}
              >
                {STATUS_LABELS[s]}
              </span>
              {reason && (
                <span className="block text-meta text-muted">{reason}</span>
              )}
            </span>
            {current && <CheckIcon className="text-(--tone)" />}
          </button>
        );
      })}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ Fecha */

const STRIP_DAYS = 21;
const STRIP_MAX_DAYS = 60;

export function DuePicker({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (date: Date | null) => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const today = todayUtcMidnight();
  const selected = value ? new Date(value) : null;
  const selectedOffset = selected ? daysBetweenUtc(selected, today) : null;

  // The strip range is fixed on first render so tapping a day never shifts it.
  const [range] = useState(() => {
    const start = Math.min(0, selectedOffset ?? 0);
    const end = Math.min(
      start + STRIP_MAX_DAYS - 1,
      Math.max(STRIP_DAYS - 1, (selectedOffset ?? 0) + 3),
    );
    return { start, end };
  });
  const days: Date[] = [];
  for (let o = range.start; o <= range.end; o++) {
    days.push(addDaysUtc(today, o));
  }

  useEffect(() => {
    const strip = stripRef.current;
    const tile = selectedRef.current;
    if (!strip || !tile) return;
    strip.scrollLeft =
      tile.offsetLeft - strip.clientWidth / 2 + tile.offsetWidth / 2;
  }, []);

  const tomorrow = addDaysUtc(today, 1);
  const monday = nextMondayUtc(today);
  const shortcuts: { key: string; label: string; date: Date }[] = [
    { key: "tomorrow", label: "Mañana", date: tomorrow },
    ...(isSameUtcDay(monday, tomorrow)
      ? []
      : [{ key: "monday", label: "Lunes", date: monday }]),
    { key: "week", label: "En una semana", date: addDaysUtc(today, 7) },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> can't be a horizontal scroller */}
      <div
        ref={stripRef}
        role="group"
        aria-label="Elegir otro día"
        className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((day, i) => {
          const offset = range.start + i;
          const isSelected = selectedOffset === offset;
          const isToday = offset === 0;
          const between =
            selectedOffset !== null &&
            offset > Math.min(0, selectedOffset) &&
            offset < Math.max(0, selectedOffset);
          return (
            <button
              key={day.toISOString()}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${formatDueDateWithWeekday(day)}${isToday ? ", hoy" : ""}`}
              onClick={() => onPick(day)}
              className={`relative flex h-14 w-11 shrink-0 flex-col items-center justify-center gap-px rounded-xl border transition-colors ${
                isSelected
                  ? "border-accent bg-accent text-accent-ink"
                  : between
                    ? "border-transparent bg-accent-soft"
                    : "border-line bg-raised hover:bg-surface"
              }`}
            >
              <small
                className={`text-[11px] leading-[14px] ${
                  isSelected ? "opacity-75" : "text-muted"
                }`}
              >
                {weekdayFormat.format(day).replace(".", "")}
              </small>
              <b className="tabular text-[16px] leading-5 font-semibold">
                {day.getUTCDate()}
              </b>
              {isToday && (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-1 size-[3px] rounded-full ${
                    isSelected ? "bg-accent-ink" : "bg-accent"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onPick(s.date)}
            className={pillClass}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          aria-expanded={calendarOpen}
          onClick={() => setCalendarOpen((o) => !o)}
          className={`${pillClass} ${calendarOpen ? "border-accent text-accent" : ""}`}
        >
          Elegir fecha
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className={`${pillClass} text-muted`}
          >
            Quitar fecha
          </button>
        )}
      </div>

      {calendarOpen && (
        <CalendarPanel
          flat
          selected={selected}
          onSelect={(date) => onPick(date)}
          className="w-full"
          bodyClassName="w-full"
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Prioridad */

const PRIORITY_STEP = 0.5;

function roundPriority(n: number): number {
  return Math.round(n * 10) / 10;
}

export function PriorityStepper({
  value,
  onChange,
  onSettle,
}: {
  value: number;
  /** Fires on every accepted value; the caller decides when to persist. */
  onChange: (value: number) => void;
  /** Fires when the user is done typing (blur / Enter). */
  onSettle: () => void;
}) {
  const [draft, setDraft] = useState(formatPriority(value));

  function parsed(): number | null {
    const n = Number(draft.trim().replace(",", "."));
    return draft.trim() !== "" && Number.isFinite(n) ? roundPriority(n) : null;
  }

  function nudge(direction: 1 | -1) {
    const next = roundPriority((parsed() ?? value) + direction * PRIORITY_STEP);
    setDraft(formatPriority(next));
    onChange(next);
  }

  function settle() {
    const n = parsed();
    if (n === null) {
      setDraft(formatPriority(value));
      return;
    }
    setDraft(formatPriority(n));
    onChange(n);
    onSettle();
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Bajar la prioridad"
        onClick={() => nudge(-1)}
        className={stepButtonClass}
      >
        <MinusIcon className="size-4" />
      </button>
      <input
        type="text"
        inputMode="decimal"
        aria-label="Prioridad"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={settle}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="tabular h-9 w-16 min-w-0 bg-transparent text-center text-[22px] font-medium tracking-[-0.02em] focus-visible:shadow-none focus-visible:outline-none"
      />
      <button
        type="button"
        aria-label="Subir la prioridad"
        onClick={() => nudge(1)}
        className={stepButtonClass}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- Completar */

export function CompletionPicker({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (date: Date) => void;
}) {
  const today = todayUtcMidnight();
  const selected = value ? new Date(value) : today;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPick(today)}
          className={pillClass}
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => onPick(addDaysUtc(today, -1))}
          className={pillClass}
        >
          Ayer
        </button>
      </div>
      <CalendarPanel
        flat
        selected={selected}
        onSelect={onPick}
        className="w-full"
        bodyClassName="w-full"
      />
    </div>
  );
}
