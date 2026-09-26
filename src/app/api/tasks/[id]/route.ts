import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireOwnedTask } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { parseTaskFields, statusRuleError } from "@/lib/task-input";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireOwnedTask(id);
  if ("response" in guard) return guard.response;

  return NextResponse.json(guard.task);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireOwnedTask(id);
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = parseTaskFields(body, "El título no puede estar vacío");
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const updates: Partial<typeof tasks.$inferInsert> = { ...parsed.value };

  if (updates.status !== undefined) {
    const resultingProgress = updates.progressPct ?? guard.task.progressPct;
    const resultingCompletedAt =
      "completedAt" in updates ? updates.completedAt : guard.task.completedAt;

    const error = statusRuleError(
      updates.status,
      resultingProgress,
      resultingCompletedAt,
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    // Leaving "completada" (or returning to "disponible") clears a stale
    // completion date.
    if (updates.status !== "completada" && !("completedAt" in updates)) {
      updates.completedAt = null;
    }
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireOwnedTask(id);
  if ("response" in guard) return guard.response;

  await db.delete(tasks).where(eq(tasks.id, id));

  return NextResponse.json({ message: "Tarea eliminada" });
}
