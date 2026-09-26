import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireOwnedGroup } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { groups, tasks } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireOwnedGroup(id);
  if ("response" in guard) return guard.response;
  const { group } = guard;

  const groupTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.groupId, id))
    .orderBy(asc(tasks.position));

  return NextResponse.json({ ...group, tasks: groupTasks });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireOwnedGroup(id);
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const updates: Partial<typeof groups.$inferInsert> = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "El nombre del grupo no puede estar vacío" },
        { status: 400 },
      );
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
    .where(eq(groups.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireOwnedGroup(id);
  if ("response" in guard) return guard.response;

  await db.delete(groups).where(eq(groups.id, id));

  return NextResponse.json({ message: "Grupo eliminado" });
}
