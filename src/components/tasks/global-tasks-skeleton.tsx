import {
  TaskListSkeleton,
  TaskTabsSkeleton,
} from "@/components/groups/group-detail-skeleton";
import { Bone } from "@/components/ui/panel";

/** Shell of the toolbar's search field and "Filtrar" button. */
const CONTROL =
  "flex h-11 items-center rounded-xl border border-control bg-raised shadow-panel";

/**
 * Whole-page placeholder for the global task list's first load. It mirrors
 * the real page (header with its count line, search and filter toolbar,
 * "Sin completar"/"Completadas" tabs and task rows) with the same line
 * heights, so nothing jumps when the tasks arrive.
 */
export function GlobalTasksSkeleton() {
  return (
    <div aria-busy="true" data-motion-ok="" className="contents">
      <span className="sr-only">Cargando</span>

      {/* Line boxes of the title (34px) and the count line (20px). */}
      <div aria-hidden="true">
        <div className="flex h-8.5 items-center">
          <Bone className="h-6.5 w-32 rounded-md" />
        </div>
        <div className="mt-1 flex h-5 items-center">
          <Bone className="h-3.5 w-36 rounded-sm" />
        </div>
      </div>

      <div aria-hidden="true" className="flex flex-col gap-4 md:gap-5">
        {/* The controls keep their real outline; only their contents are bones. */}
        <div className="flex gap-2">
          <div className={`${CONTROL} min-w-0 flex-1 gap-2.5 px-3.5`}>
            <Bone className="size-4.5 shrink-0 rounded-full" />
            <Bone className="h-3.5 w-36 rounded-sm" />
          </div>
          <div className={`${CONTROL} shrink-0 gap-2 px-3.5`}>
            <Bone className="size-4 rounded-sm" />
            <Bone className="h-3.5 w-11 rounded-sm" />
          </div>
        </div>

        <TaskTabsSkeleton widths={["w-24", "w-20"]} />
        <TaskListSkeleton />
      </div>
    </div>
  );
}
