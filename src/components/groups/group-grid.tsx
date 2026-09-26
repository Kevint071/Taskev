import type { GroupSummary } from "@/components/group-types";
import { GroupCard } from "@/components/groups/group-card";
import { EmptyState } from "@/components/ui/panel";

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
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            key={i}
            className="h-36 animate-pulse rounded-panel bg-sunken"
          />
        ))}
      </ul>
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        title={
          showArchived ? "No hay grupos archivados" : "Todavía no tienes grupos"
        }
        description={
          showArchived
            ? "Cuando archives un grupo aparecerá aquí, con todas sus tareas intactas."
            : "Usa el botón de arriba para crear el primero."
        }
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((p) => (
        <li key={p.id}>
          <GroupCard group={p} onUpdated={onUpdated} onError={onError} />
        </li>
      ))}
    </ul>
  );
}
