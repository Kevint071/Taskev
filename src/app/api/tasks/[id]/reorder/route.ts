import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireOwnedTask } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { positionBetween, renormalizedPositions } from "@/lib/ordering";

type Params = { params: Promise<{ id: string }> };

// Positions this close together are treated as exhausted precision and
// trigger a renormalization pass before computing the new position.
const MIN_GAP = 1e-6;

export async function POST(request: Request, { params }: Params) {
  const { id: taskId } = await params;
  const guard = await requireOwnedTask(taskId);
  if ("response" in guard) return guard.response;

  const projectId = guard.task.projectId;
  const body = await request.json().catch(() => null);
  const beforeTaskId =
    typeof body?.beforeTaskId === "string" ? body.beforeTaskId : null;
  const afterTaskId =
    typeof body?.afterTaskId === "string" ? body.afterTaskId : null;

  const projectTasks = await db
    .select({ id: tasks.id, position: tasks.position })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.position));

  const findPosition = (neighbourId: string | null) =>
    neighbourId
      ? (projectTasks.find((t) => t.id === neighbourId)?.position ?? null)
      : null;

  let beforePosition = findPosition(beforeTaskId);
  let afterPosition = findPosition(afterTaskId);

  if (
    (beforeTaskId && beforePosition === null) ||
    (afterTaskId && afterPosition === null)
  ) {
    return NextResponse.json(
      { error: "Tarea vecina inválida" },
      { status: 400 },
    );
  }

  const gapExhausted =
    beforePosition !== null &&
    afterPosition !== null &&
    afterPosition - beforePosition < MIN_GAP;

  if (gapExhausted) {
    const ordered = projectTasks.filter((t) => t.id !== taskId);
    const spaced = renormalizedPositions(ordered.length);
    for (let i = 0; i < ordered.length; i++) {
      await db
        .update(tasks)
        .set({ position: spaced[i] })
        .where(eq(tasks.id, ordered[i].id));
    }
    const beforeIndex = beforeTaskId
      ? ordered.findIndex((t) => t.id === beforeTaskId)
      : -1;
    const afterIndex = afterTaskId
      ? ordered.findIndex((t) => t.id === afterTaskId)
      : -1;
    beforePosition = beforeIndex >= 0 ? spaced[beforeIndex] : null;
    afterPosition = afterIndex >= 0 ? spaced[afterIndex] : null;
  }

  const newPosition = positionBetween(beforePosition, afterPosition);

  const [updated] = await db
    .update(tasks)
    .set({ position: newPosition, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();

  return NextResponse.json(updated);
}
