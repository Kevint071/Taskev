import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import { STATUS_LABELS } from "@/components/group-types";
import {
  addComment,
  createGroup,
  createTask,
  deleteGroup,
  deleteTask,
  type MutationResult,
  updateGroup,
  updateTask,
} from "@/lib/data/mutations";
import { ownedGroup, ownedTask } from "@/lib/data/repositories/access";
import { getActivitySince } from "@/lib/data/repositories/activity";
import { getUserTaskOverview } from "@/lib/data/repositories/overview";
import { db } from "@/lib/db";
import { groups, taskComments, tasks } from "@/lib/db/schema";
import { startOfDayInTimeZone } from "@/lib/time-zone";
import {
  compactTask,
  confirmationSummary,
  dayString,
  filterTasks,
  isToolName,
  parseListTasksArgs,
  parseTaskArgs,
} from "./tools";

export type ToolContext = {
  userId: string;
  /** IANA zone from the `tz` cookie; null falls back to the server's. */
  timeZone: string | null;
  now: Date;
};

/** What goes back to the model, plus an optional line for the chat UI. */
export type ToolOutcome = {
  result: Record<string, unknown>;
  isError: boolean;
  display?: string;
};

type Args = Record<string, unknown>;

const GROUP_NOT_FOUND = "Grupo no encontrado";
const TASK_NOT_FOUND = "Tarea no encontrada";
const MAX_TASK_DESCRIPTION = 2000;
const RECENT_COMMENTS = 10;

function error(message: string): ToolOutcome {
  return { result: { error: message }, isError: true };
}

function fromMutation<T>(
  outcome: MutationResult<T>,
  onSuccess: (value: T) => ToolOutcome,
): ToolOutcome {
  return outcome.ok ? onSuccess(outcome.value) : error(outcome.error);
}

function optionalText(args: Args, ...keys: string[]): Args {
  const body: Args = {};
  for (const key of keys) {
    if (args[key] !== undefined) body[key] = args[key];
  }
  return body;
}

async function listGroups(ctx: ToolContext, args: Args): Promise<ToolOutcome> {
  const archived = args.archived === true;
  const rows = await db
    .select({
      ...getTableColumns(groups),
      openCount:
        sql<number>`count(${tasks.id}) filter (where ${tasks.status} <> 'completada')`.mapWith(
          Number,
        ),
      taskCount: count(tasks.id),
      avgProgress:
        sql<number>`coalesce(round(avg(${tasks.progressPct})), 0)`.mapWith(
          Number,
        ),
    })
    .from(groups)
    .leftJoin(tasks, eq(tasks.groupId, groups.id))
    .where(
      and(
        eq(groups.userId, ctx.userId),
        archived ? isNotNull(groups.archivedAt) : isNull(groups.archivedAt),
      ),
    )
    .groupBy(groups.id)
    .orderBy(desc(groups.createdAt));

  return {
    isError: false,
    result: {
      archived,
      groups: rows.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        openTasks: group.openCount,
        totalTasks: group.taskCount,
        avgProgressPct: group.avgProgress,
      })),
    },
  };
}

async function listTasks(ctx: ToolContext, args: Args): Promise<ToolOutcome> {
  const filter = parseListTasksArgs(args);
  if (!filter.ok) return error(filter.error);
  const { tasks: all } = await getUserTaskOverview(ctx.userId, ctx.now);
  return { isError: false, result: filterTasks(all, filter.value) };
}

async function getTask(ctx: ToolContext, args: Args): Promise<ToolOutcome> {
  const owned = await ownedTask(ctx.userId, args.taskId);
  if (!owned) return error(TASK_NOT_FOUND);

  const comments = await db
    .select({ body: taskComments.body, createdAt: taskComments.createdAt })
    .from(taskComments)
    .where(eq(taskComments.taskId, owned.task.id))
    .orderBy(desc(taskComments.createdAt))
    .limit(RECENT_COMMENTS);

  const description = owned.task.description;
  return {
    isError: false,
    result: {
      task: {
        ...compactTask({ ...owned.task, groupName: owned.group.name }),
        description:
          description && description.length > MAX_TASK_DESCRIPTION
            ? `${description.slice(0, MAX_TASK_DESCRIPTION)}…`
            : description,
        groupArchived: owned.group.archivedAt !== null,
      },
      recentComments: comments.reverse().map((comment) => ({
        body: comment.body,
        date: dayString(comment.createdAt),
      })),
    },
  };
}

async function getTodayActivity(ctx: ToolContext): Promise<ToolOutcome> {
  const since = startOfDayInTimeZone(ctx.now, ctx.timeZone);
  const events = await getActivitySince(ctx.userId, since);
  const time = new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ctx.timeZone ?? undefined,
  });
  return {
    isError: false,
    result: {
      events: events.map((event) => ({
        time: time.format(event.createdAt),
        type: event.type,
        taskId: event.taskId,
        taskTitle: event.taskTitle,
        groupName: event.groupName,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        comment: event.body,
      })),
    },
  };
}

type Executor = (ctx: ToolContext, args: Args) => Promise<ToolOutcome>;

const EXECUTORS: Record<string, Executor> = {
  list_groups: listGroups,
  list_tasks: listTasks,
  get_task: getTask,
  get_today_activity: getTodayActivity,

  async create_group(ctx, args) {
    const outcome = await createGroup(
      ctx.userId,
      optionalText(args, "name", "description"),
    );
    return fromMutation(outcome, (group) => ({
      isError: false,
      result: { created: { id: group.id, name: group.name } },
      display: `Grupo creado: ${group.name}`,
    }));
  },

  async update_group(ctx, args) {
    const group = await ownedGroup(ctx.userId, args.groupId);
    if (!group) return error(GROUP_NOT_FOUND);
    const outcome = await updateGroup(
      group.id,
      optionalText(args, "name", "description"),
    );
    return fromMutation(outcome, (updated) => ({
      isError: false,
      result: { updated: { id: updated.id, name: updated.name } },
      display: `Grupo actualizado: ${updated.name}`,
    }));
  },

  async create_task(ctx, args) {
    const parsed = parseTaskArgs(args, "create");
    if (!parsed.ok) return error(parsed.error);
    const group = await ownedGroup(ctx.userId, parsed.value.id);
    if (!group) return error(GROUP_NOT_FOUND);
    const outcome = await createTask(group.id, parsed.value.body);
    return fromMutation(outcome, (task) => ({
      isError: false,
      result: {
        created: compactTask({ ...task, groupName: group.name }),
      },
      display: `Tarea creada: ${task.title} (${group.name})`,
    }));
  },

  async update_task(ctx, args) {
    const parsed = parseTaskArgs(args, "update");
    if (!parsed.ok) return error(parsed.error);
    const owned = await ownedTask(ctx.userId, parsed.value.id);
    if (!owned) return error(TASK_NOT_FOUND);
    const outcome = await updateTask(owned.task, parsed.value.body);
    return fromMutation(outcome, (task) => ({
      isError: false,
      result: {
        updated: compactTask({ ...task, groupName: owned.group.name }),
      },
      display:
        task.status !== owned.task.status
          ? `Tarea «${task.title}»: ${STATUS_LABELS[owned.task.status]} → ${STATUS_LABELS[task.status]}`
          : `Tarea actualizada: ${task.title}`,
    }));
  },

  async add_comment(ctx, args) {
    const owned = await ownedTask(ctx.userId, args.taskId);
    if (!owned) return error(TASK_NOT_FOUND);
    const outcome = await addComment(owned.task.id, optionalText(args, "body"));
    return fromMutation(outcome, () => ({
      isError: false,
      result: { commented: { taskId: owned.task.id } },
      display: `Comentario añadido en «${owned.task.title}»`,
    }));
  },

  async delete_task(ctx, args) {
    const owned = await ownedTask(ctx.userId, args.taskId);
    if (!owned) return error(TASK_NOT_FOUND);
    await deleteTask(owned.task.id);
    return {
      isError: false,
      result: { deleted: { title: owned.task.title } },
      display: `Tarea eliminada: ${owned.task.title}`,
    };
  },

  async delete_group(ctx, args) {
    const group = await ownedGroup(ctx.userId, args.groupId);
    if (!group) return error(GROUP_NOT_FOUND);
    await deleteGroup(group.id);
    return {
      isError: false,
      result: { deleted: { name: group.name } },
      display: `Grupo eliminado: ${group.name}`,
    };
  },

  archive_group: (ctx, args) => setArchived(ctx, args, true),
  unarchive_group: (ctx, args) => setArchived(ctx, args, false),
};

async function setArchived(
  ctx: ToolContext,
  args: Args,
  archived: boolean,
): Promise<ToolOutcome> {
  const group = await ownedGroup(ctx.userId, args.groupId);
  if (!group) return error(GROUP_NOT_FOUND);
  if ((group.archivedAt !== null) === archived) {
    return error(
      archived ? "El grupo ya está archivado" : "El grupo no está archivado",
    );
  }
  const outcome = await updateGroup(group.id, { archived });
  return fromMutation(outcome, (updated) => ({
    isError: false,
    result: { [archived ? "archived" : "unarchived"]: { name: updated.name } },
    display: `Grupo ${archived ? "archivado" : "desarchivado"}: ${updated.name}`,
  }));
}

/**
 * Runs one tool call for the session's user. Every executor re-checks
 * ownership, so a forged or replayed call can only touch the user's own data.
 */
export async function executeTool(
  ctx: ToolContext,
  name: string,
  args: Args,
): Promise<ToolOutcome> {
  const executor = isToolName(name) ? EXECUTORS[name] : undefined;
  if (!executor) return error(`Herramienta desconocida: ${name}`);
  return executor(ctx, args);
}

/**
 * The text of the confirmation card for a destructive call, or an error
 * outcome to answer right away when its target doesn't exist for this user.
 */
export async function describeDestructive(
  ctx: ToolContext,
  name: string,
  args: Args,
): Promise<
  { ok: true; summary: string } | { ok: false; outcome: ToolOutcome }
> {
  if (name === "delete_task") {
    const owned = await ownedTask(ctx.userId, args.taskId);
    if (!owned) return { ok: false, outcome: error(TASK_NOT_FOUND) };
    return {
      ok: true,
      summary: confirmationSummary(name, { name: owned.task.title }),
    };
  }

  const group = await ownedGroup(ctx.userId, args.groupId);
  if (!group) return { ok: false, outcome: error(GROUP_NOT_FOUND) };
  let taskCount: number | undefined;
  if (name === "delete_group") {
    const [row] = await db
      .select({ value: count() })
      .from(tasks)
      .where(eq(tasks.groupId, group.id));
    taskCount = row?.value ?? 0;
  }
  return {
    ok: true,
    summary: confirmationSummary(name, { name: group.name, taskCount }),
  };
}
