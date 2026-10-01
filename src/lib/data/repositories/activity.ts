import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, taskEvents, tasks } from "@/lib/db/schema";

export type ActivityEvent = {
  id: string;
  taskId: string;
  taskTitle: string;
  groupId: string;
  groupName: string;
  type: (typeof taskEvents.$inferSelect)["type"];
  fromStatus: (typeof taskEvents.$inferSelect)["fromStatus"];
  toStatus: (typeof taskEvents.$inferSelect)["toStatus"];
  body: string | null;
  createdAt: Date;
};

/** Audit events since `since` across the user's non-archived groups, newest first. */
export async function getActivitySince(
  userId: string,
  since: Date,
): Promise<ActivityEvent[]> {
  return db
    .select({
      id: taskEvents.id,
      taskId: taskEvents.taskId,
      taskTitle: tasks.title,
      groupId: groups.id,
      groupName: groups.name,
      type: taskEvents.type,
      fromStatus: taskEvents.fromStatus,
      toStatus: taskEvents.toStatus,
      body: taskEvents.body,
      createdAt: taskEvents.createdAt,
    })
    .from(taskEvents)
    .innerJoin(tasks, eq(taskEvents.taskId, tasks.id))
    .innerJoin(groups, eq(tasks.groupId, groups.id))
    .where(
      and(
        eq(groups.userId, userId),
        isNull(groups.archivedAt),
        gte(taskEvents.createdAt, since),
      ),
    )
    .orderBy(desc(taskEvents.createdAt));
}

/** Appends one entry to the task audit log. */
export async function recordTaskEvent(
  event: typeof taskEvents.$inferInsert,
): Promise<void> {
  await db.insert(taskEvents).values(event);
}
