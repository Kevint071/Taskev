import type { Task } from "@/components/group-types";

/** Task shape used within a `SyncQueue`-backed screen: `key` is stable across id resolution. */
export type LocalTask = Task & { key: string };

export type TaskUpdates = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "status"
    | "progressPct"
    | "dueDate"
    | "completedAt"
    | "pinnedToday"
  >
> & { priority?: number };
