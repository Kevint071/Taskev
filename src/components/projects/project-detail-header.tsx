import type { Project } from "@/components/project-types";
import { BackLink } from "@/components/projects/back-link";
import { Button } from "@/components/ui/button";
import { type SyncState, SyncStatus } from "@/components/ui/sync-status";

export function ProjectDetailHeader({
  project,
  taskCount,
  openCount,
  syncState,
  onToggleArchive,
  onDelete,
}: {
  project: Project;
  taskCount: number;
  openCount: number;
  syncState: SyncState;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-2 flex h-11 items-center justify-between gap-4">
        <BackLink />
        <span className="pr-2">
          <SyncStatus state={syncState} />
        </span>
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-page font-semibold break-words">
              {project.name}
            </h1>
            {project.archivedAt && (
              <span className="rounded-full border border-line-strong px-2 py-0.5 text-meta text-muted">
                Archivado
              </span>
            )}
          </div>
          {project.description && (
            <p className="mt-1 max-w-prose text-muted">{project.description}</p>
          )}
          <p className="tabular mt-1 text-meta text-muted">
            {taskCount === 0
              ? "Sin tareas"
              : `${openCount} abiertas de ${taskCount}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onToggleArchive}>
            {project.archivedAt ? "Desarchivar" : "Archivar"}
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}>
            Eliminar
          </Button>
        </div>
      </header>
    </div>
  );
}
