import type { Project } from "@/components/project-types";
import { BackLink } from "@/components/projects/back-link";
import { type SyncState, SyncStatus } from "@/components/ui/sync-status";

export function ProjectDetailHeader({
  project,
  taskCount,
  openCount,
  syncState,
}: {
  project: Project;
  taskCount: number;
  openCount: number;
  syncState: SyncState;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-2 flex h-11 items-center justify-between gap-4">
        <BackLink />
        <span className="pr-2">
          <SyncStatus state={syncState} />
        </span>
      </div>
      <header>
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
      </header>
    </div>
  );
}
