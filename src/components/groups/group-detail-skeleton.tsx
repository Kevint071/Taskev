import { BackLink } from "@/components/groups/back-link";
import { FLAT_TASK_LIST } from "@/components/tasks/task-row";
import { Bone } from "@/components/ui/panel";

/** Title and due-date widths vary per row so the placeholder reads as a list. */
const ROWS = [
  { title: "w-3/5", meta: "w-16", due: "w-14" },
  { title: "w-2/3", meta: "w-20", due: "w-10" },
  { title: "w-1/2", meta: "w-16", due: "w-14" },
  { title: "w-3/4", meta: "w-20", due: "w-12" },
  { title: "w-2/5", meta: "w-16", due: "w-10" },
  { title: "w-3/5", meta: "w-20", due: "w-14" },
];

/** Tab label widths; phones show only the label, wide screens add icon and count. */
const TABS = ["w-16", "w-20", "w-24"];

/**
 * Whole-page placeholder for the group detail's first load. It mirrors the
 * real page (header, phone summary, tabs, task rows, floating button) with the
 * same line heights, so nothing jumps when the data arrives.
 */
export function GroupDetailSkeleton() {
  return (
    <div aria-busy="true" data-motion-ok="" className="contents">
      <span className="sr-only">Cargando</span>

      <div className="flex flex-col gap-3" aria-hidden="true">
        <div className="-mx-2 flex h-11 items-center">
          <BackLink />
        </div>
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            {/* Line boxes of the title (34px), description (26px) and the
                desktop-only count line (18px). */}
            <div className="flex h-8.5 items-center">
              <Bone className="h-6.5 w-48 max-w-full rounded-md sm:w-64" />
            </div>
            <div className="mt-1 flex h-6.5 items-center">
              <Bone className="h-3.5 w-3/4 max-w-sm rounded-sm" />
            </div>
            <div className="mt-1 flex h-4.5 items-center max-md:hidden">
              <Bone className="h-3 w-40 rounded-sm" />
            </div>
          </div>
          <div className="pt-1 max-md:hidden">
            <Bone className="h-9 w-40 rounded-full" />
          </div>
        </div>
        {/* Phones only: open and completed counts. */}
        <div className="flex min-h-6 items-center gap-4 md:hidden">
          <Bone className="h-3.5 w-20 rounded-sm" />
          <Bone className="h-3.5 w-24 rounded-sm" />
        </div>
      </div>

      <div
        aria-hidden="true"
        className="-mt-4 flex flex-col gap-4 md:mt-0 md:gap-5"
      >
        <div className="relative flex w-full gap-1 border-b border-line md:gap-2">
          {TABS.map((width) => (
            <div
              key={width}
              className="flex h-11 min-w-0 flex-auto items-center justify-center md:h-12 md:flex-none"
            >
              <div className="flex items-center gap-2 px-2 py-1.5 md:px-2.5">
                <Bone className="hidden size-4 rounded-sm md:block" />
                <Bone className={`h-3.5 rounded-sm ${width}`} />
                <Bone className="hidden h-5 w-6 rounded-full md:block" />
              </div>
            </div>
          ))}
        </div>

        <ul className={FLAT_TASK_LIST}>
          {ROWS.map((row) => (
            <SkeletonRow key={`${row.title}-${row.meta}-${row.due}`} {...row} />
          ))}
        </ul>
      </div>

      {/* Room so the floating button never covers the last row, and the
          button itself where the real one will appear. */}
      <div aria-hidden="true" className="h-1 md:hidden" />
      <Bone className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-10 size-14 rounded-full md:hidden" />
    </div>
  );
}

/** Same anatomy as TaskRow in its flat-on-mobile card layout. */
function SkeletonRow({
  title,
  meta,
  due,
}: {
  title: string;
  meta: string;
  due: string;
}) {
  return (
    <li className="relative flex items-center gap-x-3 py-3 pr-4 pl-3.5 first:rounded-t-[9px] last:rounded-b-[9px] not-last:border-b not-last:border-line lg:rounded-xl lg:border lg:border-line lg:bg-raised lg:py-3.5 lg:shadow-panel dark:not-last:border-white/10 dark:lg:border-white/10 dark:lg:bg-[#101217]">
      {/* Status icon, phones and tablets only. */}
      <Bone className="size-4 shrink-0 rounded-full lg:hidden" />
      <div className="min-w-0 flex-1 self-start">
        {/* Title line is 20px and the meta line 24px (status control). */}
        <div className="flex h-5 items-center">
          <Bone className={`h-3.5 rounded-sm ${title}`} />
        </div>
        <div className="flex h-6 items-center gap-3 lg:mt-0.5">
          <Bone className={`h-3 rounded-sm ${meta}`} />
          <Bone className="hidden h-5 w-16 rounded-full lg:block" />
        </div>
      </div>
      {/* Due date on the right below lg; the progress ring replaces it on lg. */}
      <div className="flex h-5 items-center self-start pl-2 lg:hidden">
        <Bone className={`h-3 rounded-sm ${due}`} />
      </div>
      <Bone className="hidden size-7 shrink-0 rounded-full lg:block" />
    </li>
  );
}
