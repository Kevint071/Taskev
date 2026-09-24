import type { ProjectSummary } from "@/components/project-types";
import { ProjectCard } from "@/components/projects/project-card";
import { EmptyState } from "@/components/ui/panel";

export function ProjectGrid({
  projects,
  loading,
  showArchived,
  onUpdated,
  onError,
}: {
  projects: ProjectSummary[];
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

  if (projects.length === 0) {
    return (
      <EmptyState
        title={
          showArchived
            ? "No hay proyectos archivados"
            : "Todavía no tienes proyectos"
        }
        description={
          showArchived
            ? "Cuando archives un proyecto aparecerá aquí, con todas sus tareas intactas."
            : "Usa el botón de arriba para crear el primero."
        }
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => (
        <li key={p.id}>
          <ProjectCard project={p} onUpdated={onUpdated} onError={onError} />
        </li>
      ))}
    </ul>
  );
}
