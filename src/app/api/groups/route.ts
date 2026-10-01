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
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-guard";
import { createGroup } from "@/lib/data/services";
import { db } from "@/lib/db";
import { groups, tasks } from "@/lib/db/schema";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const includeArchived =
    new URL(request.url).searchParams.get("archived") === "true";

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
        eq(groups.userId, userId),
        includeArchived
          ? isNotNull(groups.archivedAt)
          : isNull(groups.archivedAt),
      ),
    )
    .groupBy(groups.id)
    .orderBy(desc(groups.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = await createGroup(userId, body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(result.value, { status: 201 });
}
