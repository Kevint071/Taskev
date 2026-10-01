import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskChanges = Partial<NewTask>;

/** Position of the group's last task, or null when it has none. */
export async function getLastTaskPosition(
  groupId: string,
): Promise<Task["position"] | null> {
  const [lastTask] = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(eq(tasks.groupId, groupId))
    .orderBy(desc(tasks.position))
    .limit(1);
  return lastTask?.position ?? null;
}

export async function insertTask(values: NewTask): Promise<Task> {
  const [created] = await db.insert(tasks).values(values).returning();
  return created;
}

export async function updateTaskById(
  taskId: string,
  changes: TaskChanges,
): Promise<Task> {
  const [updated] = await db
    .update(tasks)
    .set(changes)
    .where(eq(tasks.id, taskId))
    .returning();
  return updated;
}

export async function deleteTaskById(taskId: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, taskId));
}
