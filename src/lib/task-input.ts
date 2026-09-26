import {
  MAX_TASK_TITLE_LENGTH,
  TASK_STATUSES,
  type TaskStatus,
} from "./constraints";
import { blockedFromDisponible } from "./progress";

/** Task fields a request body may set, already validated and normalized. */
export type TaskFieldValues = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  progressPct?: number;
  priority?: string;
  dueDate?: Date | null;
  completedAt?: Date | null;
  pinnedToday?: boolean;
};

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type Body = Record<string, unknown> | null | undefined;

function parseDate(raw: unknown): Date | null | undefined {
  if (raw === null) return null;
  const date = new Date(raw as string);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Validates the task fields present in `body`; absent ones are left out so a
 * PATCH only touches what it sends. `emptyTitleError` differs per caller.
 */
export function parseTaskFields(
  body: Body,
  emptyTitleError: string,
): ParseResult<TaskFieldValues> {
  const values: TaskFieldValues = {};

  if (body?.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return { ok: false, error: emptyTitleError };
    if (title.length > MAX_TASK_TITLE_LENGTH) {
      return {
        ok: false,
        error: `El título no puede tener más de ${MAX_TASK_TITLE_LENGTH} caracteres`,
      };
    }
    values.title = title;
  }

  if (body?.description !== undefined) {
    values.description =
      typeof body.description === "string" ? body.description : null;
  }

  if (body?.status !== undefined) {
    if (!TASK_STATUSES.includes(body.status as TaskStatus)) {
      return { ok: false, error: "Estado inválido" };
    }
    values.status = body.status as TaskStatus;
  }

  if (body?.progressPct !== undefined) {
    const progress = Number(body.progressPct);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return { ok: false, error: "El avance debe estar entre 0 y 100" };
    }
    values.progressPct = Math.round(progress);
  }

  if (body?.priority !== undefined) {
    const priority = Number(body.priority);
    if (!Number.isFinite(priority)) {
      return { ok: false, error: "Prioridad inválida" };
    }
    values.priority = priority.toString();
  }

  if (body?.dueDate !== undefined) {
    const dueDate = parseDate(body.dueDate);
    if (dueDate === undefined) {
      return { ok: false, error: "Fecha límite inválida" };
    }
    values.dueDate = dueDate;
  }

  if (body?.pinnedToday !== undefined) {
    values.pinnedToday = Boolean(body.pinnedToday);
  }

  if (body?.completedAt !== undefined) {
    const completedAt = parseDate(body.completedAt);
    if (completedAt === undefined) {
      return { ok: false, error: "Fecha de finalización inválida" };
    }
    values.completedAt = completedAt;
  }

  return { ok: true, value: values };
}

/**
 * Why a task may not take `status` given the progress and completion date it
 * would end up with, or null when the combination is allowed.
 */
export function statusRuleError(
  status: TaskStatus,
  progressPct: number,
  completedAt: unknown,
): string | null {
  if (status === "completada") {
    if (progressPct < 100) {
      return "El avance debe estar al 100% para completar la tarea";
    }
    if (!completedAt) return "Falta la fecha de finalización";
    return null;
  }
  if (status === "disponible") {
    const blocked = blockedFromDisponible(progressPct, completedAt);
    if (blocked === "progress") {
      return "El avance debe estar en 0% para pasar a disponible";
    }
    if (blocked === "completedAt") {
      return "La tarea todavía tiene fecha de finalización; cambia antes a otro estado";
    }
  }
  return null;
}
