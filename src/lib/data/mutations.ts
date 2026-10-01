import { desc, eq } from "drizzle-orm";
import { MAX_GROUP_NAME_LENGTH } from "@/lib/constraints";
import { recordTaskEvent } from "@/lib/data/repositories/activity";
import { db } from "@/lib/db";
import { groups, taskComments, tasks } from "@/lib/db/schema";
import { positionAtEnd } from "@/lib/ordering";
import {
  parseTaskFields,
  progressRuleError,
  statusRuleError,
  unpinOnCompletion,
} from "@/lib/task-input";

/**
 * Writes shared by the route handlers and the assistant's tools. Each one
 * assumes the caller already checked ownership (requireOwned* / ownedGroup /
 * ownedTask) and fails with the same status and Spanish message the HTTP
 * API has always returned.
 */
export type MutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

type Body = Record<string, unknown> | null | undefined;

type Group = typeof groups.$inferSelect;
type Task = typeof tasks.$inferSelect;
type Comment = typeof taskComments.$inferSelect;

function fail(status: number, error: string) {
  return { ok: false, status, error } as const;
}

export async function createGroup(
  userId: string,
  body: Body,
): Promise<MutationResult<Group>> {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description : null;

  if (!name) {
    return fail(400, "El nombre del grupo es requerido");
  }

  if (name.length > MAX_GROUP_NAME_LENGTH) {
    return fail(
      400,
      `El nombre no puede tener más de ${MAX_GROUP_NAME_LENGTH} caracteres`,
    );
  }

  const [created] = await db
    .insert(groups)
    .values({ userId, name, description })
    .returning();

  return { ok: true, value: created };
}

export async function updateGroup(
  groupId: string,
  body: Body,
): Promise<MutationResult<Group>> {
  const updates: Partial<typeof groups.$inferInsert> = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return fail(400, "El nombre del grupo no puede estar vacío");
    }
    updates.name = name;
  }

  if (body?.description !== undefined) {
    updates.description =
      typeof body.description === "string" ? body.description : null;
  }

  if (body?.archived !== undefined) {
    updates.archivedAt = body.archived ? new Date() : null;
  }

  const [updated] = await db
    .update(groups)
    .set(updates)
    .where(eq(groups.id, groupId))
    .returning();

  return { ok: true, value: updated };
}

export async function deleteGroup(
  groupId: string,
): Promise<MutationResult<null>> {
  await db.delete(groups).where(eq(groups.id, groupId));
  return { ok: true, value: null };
}

export async function createTask(
  groupId: string,
  body: Body,
): Promise<MutationResult<Task>> {
  const parsed = parseTaskFields(body, "El título de la tarea es requerido");
  if (!parsed.ok) {
    return fail(400, parsed.error);
  }
  const { title, ...fields } = unpinOnCompletion(parsed.value);
  if (!title) {
    return fail(400, "El título de la tarea es requerido");
  }
  if (fields.status !== undefined) {
    const error = statusRuleError(
      fields.status,
      fields.progressPct ?? 0,
      fields.completedAt,
    );
    if (error) return fail(400, error);
  }
  // A task created without a status defaults to "disponible".
  const progressError = progressRuleError(
    fields.status ?? "disponible",
    fields.progressPct ?? 0,
  );
  if (progressError) return fail(400, progressError);
  // Only a task created as "completada" carries a completion date.
  if (fields.status !== "completada") fields.completedAt = null;

  const [lastTask] = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(eq(tasks.groupId, groupId))
    .orderBy(desc(tasks.position))
    .limit(1);

  const [created] = await db
    .insert(tasks)
    .values({
      groupId,
      ...fields,
      title,
      position: positionAtEnd(lastTask?.position ?? null),
    })
    .returning();

  await recordTaskEvent({ taskId: created.id, type: "task_created" });

  return { ok: true, value: created };
}

/** `task` is the row as it was before the update. */
export async function updateTask(
  task: Task,
  body: Body,
): Promise<MutationResult<Task>> {
  const parsed = parseTaskFields(body, "El título no puede estar vacío");
  if (!parsed.ok) {
    return fail(400, parsed.error);
  }
  const updates: Partial<typeof tasks.$inferInsert> = unpinOnCompletion({
    ...parsed.value,
  });

  if (updates.progressPct !== undefined) {
    const progressError = progressRuleError(
      updates.status ?? task.status,
      updates.progressPct,
    );
    if (progressError) return fail(400, progressError);
  }

  if (updates.status !== undefined) {
    const resultingProgress = updates.progressPct ?? task.progressPct;
    const resultingCompletedAt =
      "completedAt" in updates ? updates.completedAt : task.completedAt;

    const error = statusRuleError(
      updates.status,
      resultingProgress,
      resultingCompletedAt,
    );
    if (error) {
      return fail(400, error);
    }
    // Leaving "completada" (or returning to "disponible") clears a stale
    // completion date.
    if (updates.status !== "completada" && !("completedAt" in updates)) {
      updates.completedAt = null;
    }
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, task.id))
    .returning();

  if (updated.status !== task.status) {
    await recordTaskEvent({
      taskId: task.id,
      type: "status_changed",
      fromStatus: task.status,
      toStatus: updated.status,
    });
  }

  return { ok: true, value: updated };
}

export async function deleteTask(
  taskId: string,
): Promise<MutationResult<null>> {
  await db.delete(tasks).where(eq(tasks.id, taskId));
  return { ok: true, value: null };
}

export async function addComment(
  taskId: string,
  body: Body,
): Promise<MutationResult<Comment>> {
  const commentBody = typeof body?.body === "string" ? body.body.trim() : "";
  if (!commentBody) {
    return fail(400, "El comentario no puede estar vacío");
  }

  const [created] = await db
    .insert(taskComments)
    .values({ taskId, body: commentBody })
    .returning();

  await recordTaskEvent({
    taskId,
    type: "comment_added",
    body: commentBody,
  });

  return { ok: true, value: created };
}
