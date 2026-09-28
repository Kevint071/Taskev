import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, tasks } from "@/lib/db/schema";
import { isUuid } from "@/lib/uuid";

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

/**
 * The group, only if `groupId` is a UUID owned by `userId`; null otherwise.
 * For callers with untrusted ids (the assistant's tools), so an invented id
 * reads as "not found" instead of a Postgres error.
 */
export async function ownedGroup(userId: string, groupId: unknown) {
  if (!isUuid(groupId)) return null;
  const group = await getGroupById(groupId);
  return group && group.userId === userId ? group : null;
}

/** Same as ownedGroup, for a task and its parent group. */
export async function ownedTask(userId: string, taskId: unknown) {
  if (!isUuid(taskId)) return null;
  const owned = await getTaskWithGroup(taskId);
  return owned && owned.group.userId === userId ? owned : null;
}
