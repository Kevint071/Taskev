import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/db/schema";
import { computeRelevance } from "@/lib/relevance";

export type OverviewTask = typeof tasks.$inferSelect & {
  projectName: string;
  blocked: boolean;
  relevance: number | null;
};

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

  return { tasks: [...active, ...completed], projectCount: projectRows.length };
}
