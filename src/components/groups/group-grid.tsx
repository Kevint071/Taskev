import type { CSSProperties } from "react";
import type { GroupSummary } from "@/components/group-types";
import { GroupCard } from "@/components/groups/group-card";

const GRID = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";
const STAGGER_MS = 70;
/** Past this many cards the stagger stops growing, so long lists don't crawl in. */
const MAX_STAGGERED = 10;

function delayFor(index: number) {
  return Math.min(index, MAX_STAGGERED) * STAGGER_MS;
}

export function GroupGrid({
  groups,
  loading,
  showArchived,
  onUpdated,
  onError,
}: {
  groups: GroupSummary[];
  loading: boolean;
  showArchived: boolean;
  onUpdated: () => void;
  onError: (message: string) => void;
}) {
  if (loading) {
    return (
      <ul className={GRID} aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            key={i}
            className="h-40 animate-pulse rounded-panel bg-sunken"
          />
        ))}
      </ul>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-panel border border-dashed border-line-strong px-6 py-14 text-center">
        <div
          aria-hidden="true"
          data-motion-ok=""
          className="flex h-28 w-64 flex-col justify-between rounded-panel border border-line bg-raised p-4 text-left shadow-panel"
        >
          <div className="flex flex-col gap-2">
            <span className="h-2.5 w-28 rounded-full bg-line-strong" />
            <span className="h-2 w-40 rounded-full bg-line" />
          </div>
          <span className="relative h-0.75 rounded-full bg-line">
            <span className="animate-line-grow absolute inset-y-0 left-0 w-2/5 rounded-full bg-accent shadow-[0_0_10px_color-mix(in_srgb,var(--accent)_60%,transparent)]" />
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-section font-semibold">
            {showArchived
              ? "No hay grupos archivados"
              : "Todavía no tienes grupos"}
          </p>
          <p className="max-w-prose text-muted">
            {showArchived
              ? "Cuando archives un grupo aparecerá aquí, con todas sus tareas intactas."
              : "Un grupo reúne las tareas de un mismo objetivo y muestra cuánto llevas avanzado."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className={GRID}>
      {groups.map((p, i) => (
        <li
          key={p.id}
          data-motion-ok=""
          className="animate-rise"
          style={{ "--delay": `${delayFor(i)}ms` } as CSSProperties}
        >
          <GroupCard
            group={p}
            enterDelay={delayFor(i) + 250}
            onUpdated={onUpdated}
            onError={onError}
          />
        </li>
      ))}
    </ul>
  );
}
