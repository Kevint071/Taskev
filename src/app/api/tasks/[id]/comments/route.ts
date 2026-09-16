import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-guard";
import { getOwnedTask } from "@/lib/data/access";
import { db } from "@/lib/db";
import { taskComments } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id: taskId } = await params;
  const owned = await getOwnedTask(userId, taskId);
  if (!owned) {
    return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
  }

  const comments = await db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt));

  return NextResponse.json(comments);
}

export async function POST(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id: taskId } = await params;
  const owned = await getOwnedTask(userId, taskId);
  if (!owned) {
    return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const commentBody = typeof body?.body === "string" ? body.body.trim() : "";
  if (!commentBody) {
    return NextResponse.json(
      { error: "El comentario no puede estar vacío" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(taskComments)
    .values({ taskId, body: commentBody })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
