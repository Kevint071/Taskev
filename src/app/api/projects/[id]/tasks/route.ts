import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-guard";
import { getOwnedProject } from "@/lib/data/access";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { positionAtEnd } from "@/lib/ordering";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await getOwnedProject(userId, projectId);
  if (!project) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json(
      { error: "El título de la tarea es requerido" },
      { status: 400 },
    );
  }

  const [lastTask] = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(desc(tasks.position))
    .limit(1);

  const [created] = await db
    .insert(tasks)
    .values({
      projectId,
      title,
      position: positionAtEnd(lastTask?.position ?? null),
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
