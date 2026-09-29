/**
 * The assistant's tools as Gemini sees them, plus the pure pieces around
 * them: argument parsing, the safe/destructive split, list filtering and the
 * texts shown to the user. Database access lives in tool-executor.ts.
 */
import { utcMidnight } from "@/lib/calendar";
import { TASK_STATUSES, type TaskStatus } from "@/lib/constraints";
import type { ParseResult } from "@/lib/task-input";
import type { FunctionDeclaration } from "./provider";

export const LIST_TASKS_LIMIT = 50;
const DESCRIPTION_PREVIEW = 200;

const STATUS_LIST = TASK_STATUSES.join(", ");
const DATE_HINT = "Fecha en formato YYYY-MM-DD.";

const id = (what: string) => ({
  type: "string",
  description: `Id (UUID) ${what}, tal como lo devolvió otra herramienta.`,
});

const taskFields = {
  title: { type: "string", description: "Título, máximo 150 caracteres." },
  description: { type: "string", description: "Descripción libre." },
  status: {
    type: "string",
    enum: [...TASK_STATUSES],
    description:
      "completada exige progressPct 100 y completedDate; disponible exige progressPct 0 y sin fecha de finalización.",
  },
  progressPct: { type: "integer", description: "Avance de 0 a 100." },
  priority: {
    type: "number",
    description:
      "Prioridad; 0 es sin prioridad y un número mayor es más urgente.",
  },
  dueDate: {
    type: "string",
    description: `Fecha límite. ${DATE_HINT} Cadena vacía para quitarla.`,
  },
  completedDate: {
    type: "string",
    description: `Fecha de finalización, obligatoria al pasar a completada. ${DATE_HINT}`,
  },
  pinnedToday: {
    type: "boolean",
    description: "Fijar (true) o desfijar (false) la tarea en «Hoy».",
  },
};

const object = (
  properties: Record<string, unknown>,
  required: string[] = [],
) => ({ type: "object", properties, required });

export const TOOL_DECLARATIONS = [
  {
    type: "function",
    name: "list_groups",
    description:
      "Lista los grupos del usuario con id, nombre, descripción, tareas abiertas/total y avance medio.",
    parameters: object({
      archived: {
        type: "boolean",
        description: "true para listar los archivados en lugar de los activos.",
      },
    }),
  },
  {
    type: "function",
    name: "list_tasks",
    description: `Lista y busca tareas de los grupos activos, las activas por relevancia y después las completadas. Devuelve como máximo ${LIST_TASKS_LIMIT}, el total real, partialMatch y byStatus con cuántas coincidencias hay por estado (los estados ausentes tienen 0).`,
    parameters: object({
      groupId: id("del grupo"),
      status: { type: "string", enum: [...TASK_STATUSES] },
      excludeCompleted: {
        type: "boolean",
        description:
          'true para las "pendientes": todos los estados salvo completada. No lo combines con status.',
      },
      query: {
        type: "string",
        description:
          "Palabras a buscar en el título o la descripción. Se prefieren las tareas que tienen todas, en cualquier orden; si ninguna, se devuelven las que tienen al menos la mitad (partialMatch true). Usa pocas palabras clave, sin sinónimos dudosos.",
      },
      dueBefore: {
        type: "string",
        description: `Solo tareas que vencen ese día o antes. ${DATE_HINT}`,
      },
    }),
  },
  {
    type: "function",
    name: "get_task",
    description:
      "Detalle de una tarea, con su descripción completa y sus últimas notas de la bitácora (comentarios).",
    parameters: object({ taskId: id("de la tarea") }, ["taskId"]),
  },
  {
    type: "function",
    name: "get_today_activity",
    description:
      "Cambios de hoy en el huso horario del usuario: tareas creadas, cambios de estado y comentarios.",
    parameters: object({}),
  },
  {
    type: "function",
    name: "create_group",
    description: "Crea un grupo.",
    parameters: object(
      {
        name: { type: "string", description: "Nombre, máximo 150 caracteres." },
        description: { type: "string" },
      },
      ["name"],
    ),
  },
  {
    type: "function",
    name: "update_group",
    description: "Cambia el nombre o la descripción de un grupo.",
    parameters: object(
      {
        groupId: id("del grupo"),
        name: { type: "string" },
        description: { type: "string" },
      },
      ["groupId"],
    ),
  },
  {
    type: "function",
    name: "create_task",
    description: "Crea una tarea al final de un grupo.",
    parameters: object({ groupId: id("del grupo"), ...taskFields }, [
      "groupId",
      "title",
    ]),
  },
  {
    type: "function",
    name: "update_task",
    description:
      "Edita una tarea; solo cambia los campos que envíes. Sirve para cambiar estado, avance, fechas, prioridad o fijarla en «Hoy».",
    parameters: object({ taskId: id("de la tarea"), ...taskFields }, [
      "taskId",
    ]),
  },
  {
    type: "function",
    name: "add_comment",
    description:
      "Añade una nota a la bitácora de una tarea (sus comentarios). Úsala cuando el usuario pida anotar, comentar o registrar algo en la bitácora.",
    parameters: object(
      { taskId: id("de la tarea"), body: { type: "string" } },
      ["taskId", "body"],
    ),
  },
  {
    type: "function",
    name: "delete_task",
    description:
      "Borra una tarea. El usuario lo confirma en la interfaz antes de ejecutarse.",
    parameters: object({ taskId: id("de la tarea") }, ["taskId"]),
  },
  {
    type: "function",
    name: "delete_group",
    description:
      "Borra un grupo y todas sus tareas. El usuario lo confirma en la interfaz antes de ejecutarse.",
    parameters: object({ groupId: id("del grupo") }, ["groupId"]),
  },
  {
    type: "function",
    name: "archive_group",
    description:
      "Archiva un grupo. El usuario lo confirma en la interfaz antes de ejecutarse.",
    parameters: object({ groupId: id("del grupo") }, ["groupId"]),
  },
  {
    type: "function",
    name: "unarchive_group",
    description:
      "Desarchiva un grupo. El usuario lo confirma en la interfaz antes de ejecutarse.",
    parameters: object({ groupId: id("del grupo") }, ["groupId"]),
  },
] as const satisfies readonly FunctionDeclaration[];

export type ToolName = (typeof TOOL_DECLARATIONS)[number]["name"];

export const DESTRUCTIVE_TOOLS: ReadonlySet<string> = new Set<ToolName>([
  "delete_task",
  "delete_group",
  "archive_group",
  "unarchive_group",
]);

/** Destructive calls never run without the user's explicit confirmation. */
export function isDestructive(name: string): boolean {
  return DESTRUCTIVE_TOOLS.has(name);
}

export function isToolName(name: string): name is ToolName {
  return TOOL_DECLARATIONS.some((tool) => tool.name === name);
}

type Args = Record<string, unknown>;

/**
 * `YYYY-MM-DD` → UTC midnight, how dates are stored. null or "" clear the
 * date; anything else, including impossible days, is undefined (invalid).
 */
export function parseDateArg(raw: unknown): Date | null | undefined {
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return undefined;
  const [year, month, day] = match.slice(1).map(Number);
  const date = utcMidnight(year, month - 1, day);
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : undefined;
}

function invalidStatus(status: unknown): string | null {
  return TASK_STATUSES.includes(status as TaskStatus)
    ? null
    : `Estado inválido. Usa uno de: ${STATUS_LIST}`;
}

const TASK_BODY_FIELDS = [
  "title",
  "description",
  "status",
  "progressPct",
  "priority",
  "pinnedToday",
] as const;

/**
 * Maps create_task/update_task arguments onto the body that
 * createTask/updateTask validate, converting the date strings. `id` is the
 * group (create) or the task (update); its ownership is checked later.
 */
export function parseTaskArgs(
  args: Args,
  mode: "create" | "update",
): ParseResult<{ id: string; body: Args }> {
  const idKey = mode === "create" ? "groupId" : "taskId";
  const targetId = args[idKey];
  if (typeof targetId !== "string" || targetId === "") {
    return { ok: false, error: `Falta ${idKey}` };
  }
  if (args.status !== undefined) {
    const error = invalidStatus(args.status);
    if (error) return { ok: false, error };
  }

  const body: Args = {};
  for (const field of TASK_BODY_FIELDS) {
    if (args[field] !== undefined) body[field] = args[field];
  }
  for (const [argKey, bodyKey, label] of [
    ["dueDate", "dueDate", "Fecha límite"],
    ["completedDate", "completedAt", "Fecha de finalización"],
  ] as const) {
    if (args[argKey] === undefined) continue;
    const date = parseDateArg(args[argKey]);
    if (date === undefined) {
      return { ok: false, error: `${label} inválida: usa YYYY-MM-DD` };
    }
    body[bodyKey] = date;
  }
  return { ok: true, value: { id: targetId, body } };
}

export type ListTasksFilter = {
  groupId?: string;
  status?: TaskStatus;
  /** "pendientes": every status but completada. */
  excludeCompleted?: boolean;
  query?: string;
  dueBefore?: Date;
};

export function parseListTasksArgs(args: Args): ParseResult<ListTasksFilter> {
  const filter: ListTasksFilter = {};
  if (typeof args.groupId === "string" && args.groupId !== "") {
    filter.groupId = args.groupId;
  }
  if (args.status !== undefined) {
    const error = invalidStatus(args.status);
    if (error) return { ok: false, error };
    filter.status = args.status as TaskStatus;
  }
  if (args.excludeCompleted === true) filter.excludeCompleted = true;
  if (typeof args.query === "string" && args.query.trim() !== "") {
    filter.query = args.query.trim();
  }
  if (args.dueBefore !== undefined && args.dueBefore !== "") {
    const date = parseDateArg(args.dueBefore);
    if (!date) {
      return { ok: false, error: "dueBefore inválida: usa YYYY-MM-DD" };
    }
    filter.dueBefore = date;
  }
  return { ok: true, value: filter };
}

/** The task fields list_tasks reads; OverviewTask satisfies it. */
export type TaskLike = {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  progressPct: number;
  priority: string;
  dueDate: Date | null;
  completedAt: Date | null;
  pinnedToday: boolean;
};

export function dayString(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/** Lowercase without accents, so "campana" finds "Campaña". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function truncate(text: string | null, max: number): string | null {
  if (text === null || text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function compactTask(task: TaskLike) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    progressPct: task.progressPct,
    priority: Number(task.priority),
    dueDate: dayString(task.dueDate),
    completedAt: dayString(task.completedAt),
    pinnedToday: task.pinnedToday,
    groupId: task.groupId,
    groupName: task.groupName,
    description: truncate(task.description, DESCRIPTION_PREVIEW),
  };
}

/** How many of the query words the task mentions. */
function wordHits(task: TaskLike, words: string[]): number {
  const text = fold(`${task.title}\n${task.description ?? ""}`);
  return words.filter((word) => text.includes(word)).length;
}

/**
 * Keeps the incoming order and caps the result, reporting the real total.
 * A query first needs every word, in any order: "kaleido ticket" must find
 * "Cerrar ticket de Kaleido". When no task has them all, it falls back to
 * tasks with at least half the words, best first, so a query with a word the
 * task doesn't use ("conciliar" for "Comparar") still finds it.
 */
export function filterTasks(tasks: TaskLike[], filter: ListTasksFilter) {
  const words = filter.query ? fold(filter.query).split(/\s+/) : null;
  const dueBefore = filter.dueBefore?.getTime();
  let matches = tasks.filter(
    (task) =>
      (!filter.groupId || task.groupId === filter.groupId) &&
      (!filter.status || task.status === filter.status) &&
      (!filter.excludeCompleted || task.status !== "completada") &&
      (dueBefore === undefined ||
        (task.dueDate !== null && task.dueDate.getTime() <= dueBefore)),
  );
  let partialMatch = false;
  if (words) {
    const hits = new Map(matches.map((task) => [task, wordHits(task, words)]));
    const all = matches.filter((task) => hits.get(task) === words.length);
    if (all.length > 0) {
      matches = all;
    } else {
      const half = Math.ceil(words.length / 2);
      // Array.prototype.sort is stable, so ties keep the incoming order.
      matches = matches
        .filter((task) => (hits.get(task) ?? 0) >= half)
        .sort((x, y) => (hits.get(y) ?? 0) - (hits.get(x) ?? 0));
      partialMatch = matches.length > 0;
    }
  }
  // Counted before the cap so the model can't mistake a status that fell
  // outside the first 50 for one that has no tasks.
  const byStatus: Partial<Record<TaskStatus, number>> = {};
  for (const task of matches) {
    byStatus[task.status] = (byStatus[task.status] ?? 0) + 1;
  }
  return {
    total: matches.length,
    byStatus,
    truncated: matches.length > LIST_TASKS_LIMIT,
    partialMatch,
    tasks: matches.slice(0, LIST_TASKS_LIMIT).map(compactTask),
  };
}

/** What the confirmation card asks the user to approve. */
export function confirmationSummary(
  name: string,
  target: { name: string; taskCount?: number },
): string {
  switch (name) {
    case "delete_task":
      return `Eliminar la tarea «${target.name}»`;
    case "delete_group": {
      const count = target.taskCount ?? 0;
      const tasks =
        count === 0
          ? " (no tiene tareas)"
          : count === 1
            ? " y su única tarea"
            : ` y sus ${count} tareas`;
      return `Eliminar el grupo «${target.name}»${tasks}`;
    }
    case "archive_group":
      return `Archivar el grupo «${target.name}»`;
    case "unarchive_group":
      return `Desarchivar el grupo «${target.name}»`;
    default:
      return `Ejecutar ${name} sobre «${target.name}»`;
  }
}
