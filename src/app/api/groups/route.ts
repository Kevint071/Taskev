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
import { MAX_GROUP_NAME_LENGTH } from "@/lib/constraints";
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
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description : null;

  if (!name) {
    return NextResponse.json(
      { error: "El nombre del grupo es requerido" },
      { status: 400 },
    );
  }

  if (name.length > MAX_GROUP_NAME_LENGTH) {
    return NextResponse.json(
      {
        error: `El nombre no puede tener más de ${MAX_GROUP_NAME_LENGTH} caracteres`,
      },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(groups)
    .values({ userId, name, description })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
