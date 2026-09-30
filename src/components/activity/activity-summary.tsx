import type { ActivitySummary as Summary } from "@/lib/activity";

export const CHIPS: {
  key: "completed" | "created" | "statusChanges" | "notes";
  color: string;
  label: (n: number) => string;
}[] = [
  {
    key: "completed",
    color: "var(--status-done)",
    label: (n) => (n === 1 ? "completada" : "completadas"),
  },
  {
    key: "created",
    color: "var(--status-paused)",
    label: (n) => (n === 1 ? "creada" : "creadas"),
  },
  {
    key: "statusChanges",
    color: "var(--status-progress)",
    label: (n) => (n === 1 ? "cambio de estado" : "cambios de estado"),
  },
  {
    key: "notes",
    color: "var(--line-strong)",
    label: (n) => (n === 1 ? "nota" : "notas"),
  },
];

/**
 * The day at a glance: the total on top, then one chip per kind of change that
 * happened (kinds with nothing to count are left out).
 */
export function ActivitySummary({ summary }: { summary: Summary }) {
  const chips = CHIPS.filter((chip) => summary[chip.key] > 0);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line bg-raised p-5 shadow-panel md:p-6">
      <div>
        <p className="tabular text-[40px] font-semibold leading-none tracking-tight">
          {summary.changes}
        </p>
        <p className="mt-2 text-meta text-muted">
          {summary.changes === 1 ? "cambio" : "cambios"} en {summary.tasks}{" "}
          {summary.tasks === 1 ? "tarea" : "tareas"} hoy
        </p>
      </div>
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip.key}
              className="tabular inline-flex items-center gap-2 rounded-full bg-sunken px-3 py-1.5 text-meta font-medium"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: chip.color }}
              />
              {summary[chip.key]} {chip.label(summary[chip.key])}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
