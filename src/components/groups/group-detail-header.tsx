import type { ReactNode } from "react";
import type { Group } from "@/components/group-types";
import { BackLink } from "@/components/groups/back-link";
import { OpenCount } from "@/components/groups/open-count";
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
            <h1 className="text-page font-semibold wrap-break-word">
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
          <p className="tabular mt-1 text-meta text-muted max-md:hidden">
            {taskCount === 0 ? (
              "Sin tareas"
            ) : (
              <OpenCount open={openCount} total={taskCount} />
            )}
          </p>
        </div>
        {action && <div className="pt-1">{action}</div>}
      </header>
      <PhoneSummary taskCount={taskCount} openCount={openCount} />
    </div>
  );
}

/** Phones only: the open and completed counts in one row under the title. */
function PhoneSummary({
  taskCount,
  openCount,
}: {
  taskCount: number;
  openCount: number;
}) {
  const doneCount = taskCount - openCount;
  const figure = "text-body font-semibold text-ink";

  return (
    <div className="flex min-h-6 items-baseline text-meta text-muted md:hidden">
      {taskCount === 0 ? (
        <p>Sin tareas</p>
      ) : (
        <p className="tabular flex items-baseline gap-4">
          <span>
            <span className={figure}>{openCount}</span>{" "}
            {openCount === 1 ? "abierta" : "abiertas"}
          </span>
          <span>
            <span className={figure}>{doneCount}</span>{" "}
            {doneCount === 1 ? "completada" : "completadas"}
          </span>
        </p>
      )}
    </div>
  );
}
