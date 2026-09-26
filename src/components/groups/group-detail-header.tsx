import type { ReactNode } from "react";
import type { Group } from "@/components/group-types";
import { BackLink } from "@/components/groups/back-link";
import { type SyncState, SyncStatus } from "@/components/ui/sync-status";

export function GroupDetailHeader({
  group,
  taskCount,
  openCount,
  syncState,
  action,
}: {
  group: Group;
  taskCount: number;
  openCount: number;
  syncState: SyncState;
  /** Primary action shown beside the title. */
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-2 flex h-11 items-center justify-between gap-4">
        <BackLink />
        <span className="pr-2">
          <SyncStatus state={syncState} />
        </span>
      </div>
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-page font-semibold break-words">
              {group.name}
            </h1>
            {group.archivedAt && (
              <span className="rounded-full border border-line-strong px-2 py-0.5 text-meta text-muted">
                Archivado
              </span>
            )}
          </div>
          {group.description && (
            <p className="mt-1 max-w-prose text-muted">{group.description}</p>
          )}
          <p className="tabular mt-1 text-meta text-muted">
            {taskCount === 0
              ? "Sin tareas"
              : `${openCount} abiertas de ${taskCount}`}
          </p>
        </div>
        {action && <div className="pt-1">{action}</div>}
      </header>
    </div>
  );
}
