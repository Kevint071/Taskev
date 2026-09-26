import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireOwnedGroup } from "@/lib/auth-guard";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { positionAtEnd } from "@/lib/ordering";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id: groupId } = await params;
  const guard = await requireOwnedGroup(groupId);
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json(
      { error: "El título de la tarea es requerido" },
      { status: 400 },
    );
  }
  if (title.length > MAX_TASK_TITLE_LENGTH) {
    return NextResponse.json(
      {
        error: `El título no puede tener más de ${MAX_TASK_TITLE_LENGTH} caracteres`,
      },
      { status: 400 },
    );
  }

  const [lastTask] = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(eq(tasks.groupId, groupId))
    .orderBy(desc(tasks.position))
    .limit(1);

  const [created] = await db
    .insert(tasks)
    .values({
      groupId,
      title,
      position: positionAtEnd(lastTask?.position ?? null),
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
