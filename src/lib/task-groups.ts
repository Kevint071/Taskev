import { compareByRelevance } from "./relevance";
import { startOfDayKey } from "./today";

export const OPEN_STATUSES = [
  "disponible",
  "en_curso",
  "bloqueada",
  "pausada",
] as const;
export type OpenStatus = (typeof OPEN_STATUSES)[number];

export type TaskGroupKey = "vencidas" | "hoy" | "proximas" | "completadas";

export type GroupableTask = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  status: OpenStatus | "completada";
  /** ISO string of a UTC-midnight day, as the API serializes it. */
  dueDate: string | null;
  completedAt: string | null;
  relevance: number | null;
  progressPct: number;
};

export type TaskGroup<T> = { key: TaskGroupKey; tasks: T[] };

export type TaskFilters = {
  query: string;
  status: OpenStatus | "todas";
  projectId: string;
};

export const ALL_PROJECTS = "todos";

const GROUP_ORDER: TaskGroupKey[] = [
  "vencidas",
  "hoy",
  "proximas",
  "completadas",
];

function dueTime(task: GroupableTask): number {
  return task.dueDate ? Date.parse(task.dueDate) : 0;
}

function byDueThenRelevance(a: GroupableTask, b: GroupableTask): number {
  return dueTime(a) - dueTime(b) || compareByRelevance(a, b);
}

function byCompletedDesc(a: GroupableTask, b: GroupableTask): number {
  const at = a.completedAt ? Date.parse(a.completedAt) : 0;
  const bt = b.completedAt ? Date.parse(b.completedAt) : 0;
  return bt - at;
}

/** Dated tasks first (by due date, ties by relevance), then undated ones by relevance. */
function byProximasOrder(a: GroupableTask, b: GroupableTask): number {
  if (!!a.dueDate !== !!b.dueDate) return a.dueDate ? -1 : 1;
  return a.dueDate ? byDueThenRelevance(a, b) : compareByRelevance(a, b);
}

/**
 * Splits tasks into urgency groups: overdue, today, upcoming (everything
 * dated beyond today plus undated tasks), then completed ones apart. Groups
 * come out in that order with the empty ones omitted. Overdue/today sort by
 * due date (ties by relevance); upcoming puts dated tasks first by due date
 * then undated ones by relevance; completed sorts by most recently finished.
 */
export function buildTaskGroups<T extends GroupableTask>(
  tasks: T[],
  now: Date,
): TaskGroup<T>[] {
  const today = startOfDayKey(now);
  const buckets: Record<TaskGroupKey, T[]> = {
    vencidas: [],
    hoy: [],
    proximas: [],
    completadas: [],
  };

  for (const task of tasks) {
    if (task.status === "completada") {
      buckets.completadas.push(task);
    } else if (!task.dueDate) {
      buckets.proximas.push(task);
    } else {
      const due = dueTime(task);
      if (due < today) buckets.vencidas.push(task);
      else if (due === today) buckets.hoy.push(task);
      else buckets.proximas.push(task);
    }
  }

  buckets.vencidas.sort(byDueThenRelevance);
  buckets.hoy.sort(byDueThenRelevance);
  buckets.proximas.sort(byProximasOrder);
  buckets.completadas.sort(byCompletedDesc);

  return GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    tasks: buckets[key],
  }));
}

/** Lowercase and strip accents, so "revision" finds "Revisión". */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Applies the search box, status chip and project select together. */
export function filterTasks<T extends GroupableTask>(
  tasks: T[],
  { query, status, projectId }: TaskFilters,
): T[] {
  const needle = normalize(query.trim());
  return tasks.filter((task) => {
    if (status !== "todas" && task.status !== status) return false;
    if (projectId !== ALL_PROJECTS && task.projectId !== projectId) {
      return false;
    }
    if (!needle) return true;
    return (
      normalize(task.title).includes(needle) ||
      normalize(task.projectName).includes(needle)
    );
  });
}

/** How many open tasks sit in each open status. */
export function countByStatus(
  tasks: GroupableTask[],
): Record<OpenStatus, number> {
  const counts: Record<OpenStatus, number> = {
    disponible: 0,
    en_curso: 0,
    bloqueada: 0,
    pausada: 0,
  };
  for (const task of tasks) {
    if (task.status !== "completada") counts[task.status]++;
  }
  return counts;
}
