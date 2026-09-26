import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireOwnedGroup } from "@/lib/auth-guard";
import { recordTaskEvent } from "@/lib/data/activity";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { positionAtEnd } from "@/lib/ordering";
import { parseTaskFields, statusRuleError } from "@/lib/task-input";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id: groupId } = await params;
  const guard = await requireOwnedGroup(groupId);
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = parseTaskFields(body, "El título de la tarea es requerido");
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { title, ...fields } = parsed.value;
  if (!title) {
    return NextResponse.json(
      { error: "El título de la tarea es requerido" },
      { status: 400 },
    );
  }
  if (fields.status !== undefined) {
    const error = statusRuleError(
      fields.status,
      fields.progressPct ?? 0,
      fields.completedAt,
    );
    if (error) return NextResponse.json({ error }, { status: 400 });
  }
  // Only a task created as "completada" carries a completion date.
  if (fields.status !== "completada") fields.completedAt = null;

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
      ...fields,
      title,
      position: positionAtEnd(lastTask?.position ?? null),
    })
    .returning();

  await recordTaskEvent({ taskId: created.id, type: "task_created" });

  return NextResponse.json(created, { status: 201 });
}
