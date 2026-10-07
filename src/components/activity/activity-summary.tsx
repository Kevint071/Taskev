import type { CSSProperties, ReactNode } from "react";
import {
  CheckIcon,
  LayersIcon,
  NoteIcon,
  PlusIcon,
  RefreshIcon,
} from "@/components/ui/icons";
import type { ActivitySummary as Summary } from "@/lib/activity";

export const CHIPS: {
  key: "completed" | "created" | "statusChanges" | "notes";
  color: string;
  /** Colour for the icon; `color` alone is a hairline grey for notes, too faint. */
  tone: string;
  Icon: (props: { className?: string }) => ReactNode;
  label: (n: number) => string;
}[] = [
  {
    key: "completed",
    color: "var(--status-done)",
    tone: "var(--status-done)",
    Icon: CheckIcon,
    label: (n) => (n === 1 ? "completada" : "completadas"),
  },
  {
    key: "created",
    color: "var(--status-paused)",
    tone: "var(--status-paused)",
    Icon: PlusIcon,
    label: (n) => (n === 1 ? "creada" : "creadas"),
  },
  {
    key: "statusChanges",
    color: "var(--status-progress)",
    tone: "var(--status-progress)",
    Icon: RefreshIcon,
    label: (n) => (n === 1 ? "cambio de estado" : "cambios de estado"),
  },
  {
    key: "notes",
    color: "var(--line-strong)",
    tone: "var(--status-open)",
    Icon: NoteIcon,
    label: (n) => (n === 1 ? "nota" : "notas"),
  },
];

/**
 * The day at a glance, as one row without a card around it: a count per kind
 * of change, each with its icon (kinds with nothing to count are left out),
 * then how many tasks they touched.
 */
export function ActivitySummary({ summary }: { summary: Summary }) {
  const items = [
    ...CHIPS.filter((chip) => summary[chip.key] > 0).map(
      ({ key, tone, Icon, label }) => ({
        key,
        tone,
        Icon,
        count: summary[key],
        label: label(summary[key]),
      }),
    ),
    {
      key: "tasks",
      tone: "var(--status-open)",
      Icon: LayersIcon,
      count: summary.tasks,
      label: summary.tasks === 1 ? "tarea editada" : "tareas editadas",
    },
  ];

  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      {items.map(({ key, tone, Icon, count, label }, i) => (
        <li
          key={key}
          className="tabular animate-rise inline-flex items-center gap-2 text-ui"
          style={{ "--delay": `${i * 55}ms` } as CSSProperties}
        >
          <span
            aria-hidden="true"
            className="inline-flex"
            style={{ color: tone }}
          >
            <Icon className="size-4" />
          </span>
          <span className="font-semibold">{count}</span>
          <span className="text-muted">{label}</span>
        </li>
      ))}
    </ul>
  );
}
