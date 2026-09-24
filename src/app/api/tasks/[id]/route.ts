import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireOwnedTask } from "@/lib/auth-guard";
import { MAX_TASK_TITLE_LENGTH, TASK_STATUSES } from "@/lib/constraints";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { blockedFromDisponible } from "@/lib/progress";

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
  const updates: Partial<typeof tasks.$inferInsert> = {};

  if (body?.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "El título no puede estar vacío" },
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
    updates.title = title;
  }

  if (body?.description !== undefined) {
    updates.description =
      typeof body.description === "string" ? body.description : null;
  }

  if (body?.status !== undefined) {
    if (!TASK_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (body?.progressPct !== undefined) {
    const progress = Number(body.progressPct);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return NextResponse.json(
        { error: "El avance debe estar entre 0 y 100" },
        { status: 400 },
      );
    }
    updates.progressPct = Math.round(progress);
  }

  if (body?.priority !== undefined) {
    const priority = Number(body.priority);
    if (!Number.isFinite(priority)) {
      return NextResponse.json(
        { error: "Prioridad inválida" },
        { status: 400 },
      );
    }
    updates.priority = priority.toString();
  }

  if (body?.dueDate !== undefined) {
    if (body.dueDate === null) {
      updates.dueDate = null;
    } else {
      const dueDate = new Date(body.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        return NextResponse.json(
          { error: "Fecha límite inválida" },
          { status: 400 },
        );
      }
      updates.dueDate = dueDate;
    }
  }

  if (body?.pinnedToday !== undefined) {
    updates.pinnedToday = Boolean(body.pinnedToday);
  }

  if (body?.completedAt !== undefined) {
    if (body.completedAt === null) {
      updates.completedAt = null;
    } else {
      const completedAt = new Date(body.completedAt);
      if (Number.isNaN(completedAt.getTime())) {
        return NextResponse.json(
          { error: "Fecha de finalización inválida" },
          { status: 400 },
        );
      }
      updates.completedAt = completedAt;
    }
  }

  if (updates.status !== undefined) {
    const resultingProgress = updates.progressPct ?? guard.task.progressPct;
    const resultingCompletedAt =
      "completedAt" in updates ? updates.completedAt : guard.task.completedAt;

    if (updates.status === "completada") {
      if (resultingProgress < 100) {
        return NextResponse.json(
          { error: "El avance debe estar al 100% para completar la tarea" },
          { status: 400 },
        );
      }
      if (!resultingCompletedAt) {
        return NextResponse.json(
          { error: "Falta la fecha de finalización" },
          { status: 400 },
        );
      }
    } else if (updates.status === "disponible") {
      const blocked = blockedFromDisponible(
        resultingProgress,
        resultingCompletedAt,
      );
      if (blocked === "progress") {
        return NextResponse.json(
          { error: "El avance debe estar en 0% para pasar a disponible" },
          { status: 400 },
        );
      }
      if (blocked === "completedAt") {
        return NextResponse.json(
          {
            error:
              "La tarea todavía tiene fecha de finalización; cambia antes a otro estado",
          },
          { status: 400 },
        );
      }
      if (!("completedAt" in updates)) updates.completedAt = null;
    } else if (!("completedAt" in updates)) {
      // Leaving "completada" clears a stale completion date.
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
