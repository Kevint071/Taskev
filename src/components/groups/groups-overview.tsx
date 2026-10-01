"use client";

import type { ComponentType, CSSProperties } from "react";
import type { GroupSummary } from "@/components/group-types";
import { useCountUp } from "@/components/groups/use-count-up";
import {
  CalendarIcon,
  LayersIcon,
  ProgressGaugeIcon,
} from "@/components/ui/icons";

const MAX_BARS = 8;

/** One bar per group, growing from the baseline; only on wide screens. */
function MiniBars({ values, delay }: { values: number[]; delay: number }) {
  const shown = values.slice(0, MAX_BARS);
  const max = Math.max(1, ...shown);
  return (
    <span
      aria-hidden="true"
      className="hidden h-9 shrink-0 items-end gap-1 sm:flex"
    >
      {shown.map((value, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: one bar per group, in list order
          key={i}
          className="animate-grow-y w-1.5 rounded-[3px] bg-(--tone)"
          style={
            {
              height: `${Math.max(12, (value / max) * 100)}%`,
              opacity: value === 0 ? 0.25 : 0.85,
              "--delay": `${delay + i * 45}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

function Stat({
  icon: Icon,
  tone,
  value,
  suffix,
  label,
  shortLabel,
  delay,
  fill,
  bars,
}: {
  icon: ComponentType<{ className?: string }>;
  /** CSS color of the icon and the bar. */
  tone: string;
  value: number;
  suffix?: string;
  label: string;
  /** Label on phones, where the cell is too narrow for the full one. */
  shortLabel: string;
  delay: number;
  /** Percentage of the bar along the cell's bottom edge; none when omitted. */
  fill?: number;
  /** One value per group, drawn as a mini bar chart on wide screens. */
  bars: number[];
}) {
  const shown = useCountUp(value, delay + 250, 900);
  return (
    <div
      className="relative flex min-w-0 items-center justify-between gap-4 px-3.5 py-3 sm:px-5 sm:py-3.5"
      style={{ "--tone": tone } as CSSProperties}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="flex items-center gap-1.5 text-meta text-muted">
          <span
            className="animate-dot-pop flex shrink-0 text-(--tone)"
            style={{ "--delay": `${delay + 150}ms` } as CSSProperties}
          >
            <Icon className="size-3.5" />
          </span>
          <span className="truncate sm:hidden">{shortLabel}</span>
          <span className="hidden truncate sm:inline">{label}</span>
        </p>
        <p className="tabular text-section leading-7 font-semibold text-ink">
          {shown}
          {suffix && (
            <span className="ml-0.5 text-ui font-medium text-muted">
              {suffix}
            </span>
          )}
        </p>
      </div>
      <MiniBars values={bars} delay={delay + 200} />
      {fill !== undefined && (
        <span
          aria-hidden="true"
          className="animate-line-grow absolute bottom-0 left-0 h-0.5 rounded-r-full bg-(--tone)"
          style={
            {
              width: `${fill}%`,
              "--delay": `${delay + 250}ms`,
            } as CSSProperties
          }
        />
      )}
    </div>
  );
}

/** Three figures that sum up the active groups, above the grid. */
export function GroupsOverview({ groups }: { groups: GroupSummary[] }) {
  const open = groups.reduce((sum, g) => sum + g.openCount, 0);
  const withTasks = groups.filter((g) => g.taskCount > 0);
  const average = withTasks.length
    ? Math.round(
        withTasks.reduce((sum, g) => sum + g.avgProgress, 0) / withTasks.length,
      )
    : 0;

  return (
    <div
      data-motion-ok=""
      className="animate-rise relative grid grid-cols-3 divide-x divide-line overflow-hidden rounded-panel border border-line bg-raised shadow-panel"
    >
      <Stat
        icon={LayersIcon}
        tone="var(--accent)"
        value={groups.length}
        label="Grupos activos"
        shortLabel="Grupos"
        delay={0}
        bars={groups.map((g) => g.taskCount)}
      />
      <Stat
        icon={CalendarIcon}
        tone="var(--status-paused)"
        value={open}
        label="Tareas abiertas"
        shortLabel="Abiertas"
        delay={70}
        bars={groups.map((g) => g.openCount)}
      />
      <Stat
        icon={ProgressGaugeIcon}
        tone="var(--status-done)"
        value={average}
        suffix="%"
        label="Avance medio"
        shortLabel="Avance"
        delay={140}
        fill={average}
        bars={groups.map((g) => g.avgProgress)}
      />
    </div>
  );
}

/** Same footprint as the overview while the groups load, so nothing jumps. */
export function GroupsOverviewSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-[4.0625rem] animate-pulse rounded-panel bg-sunken"
    />
  );
}
