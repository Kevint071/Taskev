import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/db/schema";
import { computeRelevance } from "@/lib/relevance";

export type OverviewTask = typeof tasks.$inferSelect & {
  projectName: string;
  blocked: boolean;
  relevance: number | null;
};

export type ProjectOverview = {
  id: string;
  name: string;
  openCount: number;
  taskCount: number;
  avgProgress: number;
};

/**
 * All tasks in the user's non-archived projects: active ones by relevance
 * (highest first), then completed ones by most recently updated. Also returns
 * a per-project summary.
 */
export async function getUserTaskOverview(userId: string, now: Date) {
  const [rows, projectRows] = await Promise.all([
    db
      .select({ task: tasks, projectName: projects.name })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(projects.userId, userId), isNull(projects.archivedAt))),
    db
      .select({
        id: projects.id,
        name: projects.name,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.archivedAt))),
  ]);

  const active: OverviewTask[] = rows
    .filter((r) => r.task.status !== "completada")
    .map((r) => ({
      ...r.task,
      projectName: r.projectName,
      blocked: r.task.status === "bloqueada",
      relevance: computeRelevance(Number(r.task.priority), r.task.dueDate, now),
    }))
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));

  const completed: OverviewTask[] = rows
    .filter((r) => r.task.status === "completada")
    .map((r) => ({
      ...r.task,
      projectName: r.projectName,
      blocked: false,
      relevance: null,
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const projectSummaries: ProjectOverview[] = projectRows
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((p) => {
      const own = rows.filter((r) => r.task.projectId === p.id);
      const total = own.reduce((sum, r) => sum + r.task.progressPct, 0);
      return {
        id: p.id,
        name: p.name,
        openCount: own.filter((r) => r.task.status !== "completada").length,
        taskCount: own.length,
        avgProgress: own.length === 0 ? 0 : Math.round(total / own.length),
      };
    });

  return { tasks: [...active, ...completed], projects: projectSummaries };
}
