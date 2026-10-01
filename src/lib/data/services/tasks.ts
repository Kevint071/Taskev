import { recordTaskEvent } from "@/lib/data/repositories/activity";
import {
  deleteTaskById,
  getLastTaskPosition,
  insertTask,
  type Task,
  type TaskChanges,
  updateTaskById,
} from "@/lib/data/repositories/tasks";
import { positionAtEnd } from "@/lib/ordering";
import {
  parseTaskFields,
  progressRuleError,
  statusRuleError,
  unpinOnCompletion,
} from "@/lib/task-input";
import { type Body, fail, type MutationResult } from "./result";

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

  const lastPosition = await getLastTaskPosition(groupId);
  const created = await insertTask({
    groupId,
    ...fields,
    title,
    position: positionAtEnd(lastPosition),
  });

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
  const updates: TaskChanges = unpinOnCompletion({ ...parsed.value });

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

  const updated = await updateTaskById(task.id, updates);

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
  await deleteTaskById(taskId);
  return { ok: true, value: null };
}
