import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, tasks } from "@/lib/db/schema";

/**
 * Unfiltered by owner so callers (see auth-guard's requireOwned* helpers)
 * can run this alongside the user lookup instead of after it.
 */
export async function getGroupById(groupId: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  return group ?? null;
}

/** Returns the task with its group, unfiltered by owner — see getGroupById. */
export async function getTaskWithGroup(taskId: string) {
  const [row] = await db
    .select({ task: tasks, group: groups })
    .from(tasks)
    .innerJoin(groups, eq(tasks.groupId, groups.id))
    .where(eq(tasks.id, taskId))
    .limit(1);
  return row ?? null;
}
