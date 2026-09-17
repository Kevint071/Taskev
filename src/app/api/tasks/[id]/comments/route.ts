import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireOwnedTask } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { taskComments } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id: taskId } = await params;
  const guard = await requireOwnedTask(taskId);
  if ("response" in guard) return guard.response;

  const comments = await db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt));

  return NextResponse.json(comments);
}

export async function POST(request: Request, { params }: Params) {
  const { id: taskId } = await params;
  const guard = await requireOwnedTask(taskId);
  if ("response" in guard) return guard.response;

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
