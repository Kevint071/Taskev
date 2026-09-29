import {
  ALL_GROUPS,
  OPEN_STATUSES,
  type TaskFilters,
} from "@/lib/task-buckets";

const STORAGE_KEY = "taskev:tasks-filters";

export const NO_FILTERS: TaskFilters = {
  query: "",
  status: "todas",
  groupId: ALL_GROUPS,
};

/** Rebuilds filters from stored JSON, dropping anything malformed or unknown. */
export function parseTaskFilters(raw: string | null): TaskFilters {
  if (!raw) return NO_FILTERS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    // Corrupt or hand-edited entry: fall back to no filters.
    return NO_FILTERS;
  }
  if (typeof data !== "object" || data === null) return NO_FILTERS;
  const { query, status, groupId } = data as Record<string, unknown>;
  return {
    query: typeof query === "string" ? query : NO_FILTERS.query,
    status:
      typeof status === "string" &&
      (OPEN_STATUSES as readonly string[]).includes(status)
        ? (status as TaskFilters["status"])
        : NO_FILTERS.status,
    groupId: typeof groupId === "string" ? groupId : NO_FILTERS.groupId,
  };
}

/** Filters kept for this browser tab, so they survive a visit to a task. */
export function loadTaskFilters(): TaskFilters {
  try {
    return parseTaskFilters(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage blocked (private mode, SSR): behave as if nothing was saved.
    return NO_FILTERS;
  }
}

export function saveTaskFilters(filters: TaskFilters): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Storage blocked or full: filters just won't persist across navigation.
  }
}
