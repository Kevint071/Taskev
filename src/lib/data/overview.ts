import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/db/schema";
import {
  compareByRelevance,
  computeRelevance,
  positionRank,
} from "@/lib/relevance";

export type OverviewTask = typeof tasks.$inferSelect & {
  projectName: string;
  blocked: boolean;
  relevance: number | null;
  /** This task's spot in its project's manual order, 0 (first) to 1 (last). */
  positionRank: number;
};

/** Ranks each task against the others in the same project, by `position`. */
function withPositionRanks<
  T extends { id: string; projectId: string; position: number },
>(rows: T[]): Map<string, number> {
  const byProject = new Map<string, T[]>();
  for (const row of rows) {
    const group = byProject.get(row.projectId);
    if (group) group.push(row);
    else byProject.set(row.projectId, [row]);
  }
  const ranks = new Map<string, number>();
  for (const group of byProject.values()) {
    group.sort((a, b) => a.position - b.position);
    group.forEach((row, i) => {
      ranks.set(row.id, positionRank(i, group.length));
    });
  }
  return ranks;
}

/**
 * All tasks in the user's non-archived projects: active ones by relevance
 * (highest first), then completed ones by most recently updated. Also
 * returns the project count needed for the "Hoy" empty state.
 */
export async function getUserTaskOverview(userId: string, now: Date) {
  const [rows, projectRows] = await Promise.all([
    db
      .select({ task: tasks, projectName: projects.name })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(projects.userId, userId), isNull(projects.archivedAt))),
    db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.archivedAt))),
  ]);

  const openRows = rows.filter((r) => r.task.status !== "completada");
  const ranks = withPositionRanks(openRows.map((r) => r.task));

  const active: OverviewTask[] = openRows
    .map((r) => ({
      ...r.task,
      projectName: r.projectName,
      blocked: r.task.status === "bloqueada",
      relevance: computeRelevance(Number(r.task.priority), r.task.dueDate, now),
      positionRank: ranks.get(r.task.id) ?? 0,
    }))
    .sort(compareByRelevance);

  const completed: OverviewTask[] = rows
    .filter((r) => r.task.status === "completada")
    .map((r) => ({
      ...r.task,
      projectName: r.projectName,
      blocked: false,
      relevance: null,
      positionRank: 0,
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return { tasks: [...active, ...completed], projectCount: projectRows.length };
}
