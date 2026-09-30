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
 * The day at a glance: the total as one plain sentence, the makeup of the day
 * as a proportional bar and a legend with a count per kind of change (kinds
 * with nothing to count are left out).
 */
export function ActivitySummary({ summary }: { summary: Summary }) {
  const chips = CHIPS.filter((chip) => summary[chip.key] > 0);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-raised p-5 shadow-panel md:p-6">
      <p className="tabular text-ui text-muted">
        <span className="font-semibold text-ink">{summary.changes}</span>{" "}
        {summary.changes === 1 ? "cambio" : "cambios"} en {summary.tasks}{" "}
        {summary.tasks === 1 ? "tarea" : "tareas"} hoy
      </p>
      {chips.length > 0 && (
        <>
          <div
            aria-hidden="true"
            className="h-2 overflow-hidden rounded-full bg-sunken"
          >
            {/* The negative margin clips the last segment's trailing gap. */}
            <div className="-mr-0.5 flex h-full">
              {chips.map((chip) => (
                <span
                  key={chip.key}
                  className="mr-0.5 block h-full basis-0 min-w-1"
                  style={{
                    flexGrow: summary[chip.key],
                    backgroundColor: chip.color,
                  }}
                />
              ))}
            </div>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
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
                <span className="font-semibold">{summary[chip.key]}</span>
                <span className="text-muted">
                  {chip.label(summary[chip.key])}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
