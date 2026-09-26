import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, taskComments, tasks } from "@/lib/db/schema";

export type RecentComment = {
  id: string;
  taskId: string;
  taskTitle: string;
  groupId: string;
  groupName: string;
  body: string;
  createdAt: Date;
};

/** Most recent comments across the user's non-archived groups. */
export async function getRecentComments(
  userId: string,
  limit = 5,
): Promise<RecentComment[]> {
  return db
    .select({
      id: taskComments.id,
      taskId: taskComments.taskId,
      taskTitle: tasks.title,
      groupId: groups.id,
      groupName: groups.name,
      body: taskComments.body,
      createdAt: taskComments.createdAt,
    })
    .from(taskComments)
    .innerJoin(tasks, eq(taskComments.taskId, tasks.id))
    .innerJoin(groups, eq(tasks.groupId, groups.id))
    .where(and(eq(groups.userId, userId), isNull(groups.archivedAt)))
    .orderBy(desc(taskComments.createdAt))
    .limit(limit);
}
