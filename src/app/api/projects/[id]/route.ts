import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-guard";
import { getOwnedProject } from "@/lib/data/access";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const project = await getOwnedProject(userId, id);
  if (!project) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 },
    );
  }

  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, id))
    .orderBy(asc(tasks.position));

  return NextResponse.json({ ...project, tasks: projectTasks });
}

export async function PATCH(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const project = await getOwnedProject(userId, id);
  if (!project) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const updates: Partial<typeof projects.$inferInsert> = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "El nombre del proyecto no puede estar vacío" },
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
    .update(projects)
    .set(updates)
    .where(eq(projects.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const project = await getOwnedProject(userId, id);
  if (!project) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 },
    );
  }

  await db.delete(projects).where(eq(projects.id, id));

  return NextResponse.json({ message: "Proyecto eliminado" });
}
