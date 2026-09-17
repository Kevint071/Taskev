import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/db/schema";

/**
 * Unfiltered by owner so callers (see auth-guard's requireOwned* helpers)
 * can run this alongside the user lookup instead of after it.
 */
export async function getProjectById(projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return project ?? null;
}

/** Returns the task with its project, unfiltered by owner — see getProjectById. */
export async function getTaskWithProject(taskId: string) {
  const [row] = await db
    .select({ task: tasks, project: projects })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.id, taskId))
    .limit(1);
  return row ?? null;
}
