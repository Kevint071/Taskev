import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireOwnedGroup } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { renormalizedPositions } from "@/lib/ordering";

type Params = { params: Promise<{ id: string }> };

/**
 * Replaces the group's whole task order in one shot (used by the
 * "automatic sort" action, which computes a full new order client-side and
 * persists it here instead of moving tasks one at a time).
 */
export async function POST(request: Request, { params }: Params) {
  const { id: groupId } = await params;
  const guard = await requireOwnedGroup(groupId);
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const rawTaskIds = body?.taskIds;
  const taskIds = Array.isArray(rawTaskIds)
    ? rawTaskIds.filter((v: unknown): v is string => typeof v === "string")
    : null;
  if (!taskIds || taskIds.length === 0) {
    return NextResponse.json(
      { error: "Lista de tareas inválida" },
      { status: 400 },
    );
  }

  const groupTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.groupId, groupId));

  const groupTaskIds = new Set(groupTasks.map((t) => t.id));
  const validRequest =
    taskIds.length === groupTaskIds.size &&
    new Set(taskIds).size === taskIds.length &&
    taskIds.every((taskId) => groupTaskIds.has(taskId));
  if (!validRequest) {
    return NextResponse.json(
      { error: "Lista de tareas inválida" },
      { status: 400 },
    );
  }

  const positions = renormalizedPositions(taskIds.length);
  const updated = await Promise.all(
    taskIds.map(async (taskId, i) => {
      const [row] = await db
        .update(tasks)
        .set({ position: positions[i] })
        .where(eq(tasks.id, taskId))
        .returning({ id: tasks.id, position: tasks.position });
      return row;
    }),
  );

  return NextResponse.json(updated);
}
