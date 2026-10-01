import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, tasks } from "@/lib/db/schema";
import {
  compareByRelevance,
  computeRelevance,
  positionRank,
} from "@/lib/relevance";

export type OverviewTask = typeof tasks.$inferSelect & {
  groupName: string;
  blocked: boolean;
  relevance: number | null;
  /** This task's spot in its group's manual order, 0 (first) to 1 (last). */
  positionRank: number;
};

/** Ranks each task against the others in the same group, by `position`. */
function withPositionRanks<
  T extends { id: string; groupId: string; position: number },
>(rows: T[]): Map<string, number> {
  const byGroup = new Map<string, T[]>();
  for (const row of rows) {
    const group = byGroup.get(row.groupId);
    if (group) group.push(row);
    else byGroup.set(row.groupId, [row]);
  }
  const ranks = new Map<string, number>();
  for (const group of byGroup.values()) {
    group.sort((a, b) => a.position - b.position);
    group.forEach((row, i) => {
      ranks.set(row.id, positionRank(i, group.length));
    });
  }
  return ranks;
}

/**
 * All tasks in the user's non-archived groups: active ones by relevance
 * (highest first), then completed ones by most recently updated. Also
 * returns the group count needed for the "Hoy" empty state.
 */
export async function getUserTaskOverview(userId: string, now: Date) {
  const [rows, groupRows] = await Promise.all([
    db
      .select({ task: tasks, groupName: groups.name })
      .from(tasks)
      .innerJoin(groups, eq(tasks.groupId, groups.id))
      .where(and(eq(groups.userId, userId), isNull(groups.archivedAt))),
    db
      .select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.userId, userId), isNull(groups.archivedAt))),
  ]);

  const openRows = rows.filter((r) => r.task.status !== "completada");
  const ranks = withPositionRanks(openRows.map((r) => r.task));

  const active: OverviewTask[] = openRows
    .map((r) => ({
      ...r.task,
      groupName: r.groupName,
      blocked: r.task.status === "bloqueada",
      relevance: computeRelevance(Number(r.task.priority), r.task.dueDate, now),
      positionRank: ranks.get(r.task.id) ?? 0,
    }))
    .sort(compareByRelevance);

  const completed: OverviewTask[] = rows
    .filter((r) => r.task.status === "completada")
    .map((r) => ({
      ...r.task,
      groupName: r.groupName,
      blocked: false,
      relevance: null,
      positionRank: 0,
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return { tasks: [...active, ...completed], groupCount: groupRows.length };
}
