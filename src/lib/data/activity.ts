import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, taskComments, tasks } from "@/lib/db/schema";

export type RecentComment = {
  id: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  body: string;
  createdAt: Date;
};

/** Most recent comments across the user's non-archived projects. */
export async function getRecentComments(
  userId: string,
  limit = 5,
): Promise<RecentComment[]> {
  return db
    .select({
      id: taskComments.id,
      taskId: taskComments.taskId,
      taskTitle: tasks.title,
      projectId: projects.id,
      projectName: projects.name,
      body: taskComments.body,
      createdAt: taskComments.createdAt,
    })
    .from(taskComments)
    .innerJoin(tasks, eq(taskComments.taskId, tasks.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(projects.userId, userId), isNull(projects.archivedAt)))
    .orderBy(desc(taskComments.createdAt))
    .limit(limit);
}
