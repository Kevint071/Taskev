import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProjectById, getTaskWithProject } from "@/lib/data/access";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type CurrentUser = { id: string; email: string; name: string | null };

/**
 * Resolves the session to a user that still exists. JWT sessions outlive a
 * deleted account, so the row is checked on every call.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return user ?? null;
}

/**
 * Guard used by every projects/tasks/comments route handler.
 * Returns the authenticated user's id, or null if there is no valid session.
 */
export async function requireUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

const UNAUTHENTICATED = {
  response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
} as const;

/**
 * Fetches the current user and the target project concurrently instead of
 * sequentially, since the project lookup doesn't actually need the user id
 * until the ownership check below — each is a separate network round trip
 * to the DB, so running them in parallel halves that part of the latency.
 */
export async function requireOwnedProject(projectId: string) {
  const [userId, project] = await Promise.all([
    requireUserId(),
    getProjectById(projectId),
  ]);

  if (!userId) return UNAUTHENTICATED;
  if (!project || project.userId !== userId) {
    return {
      response: NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 },
      ),
    } as const;
  }
  return { userId, project } as const;
}

/** Same idea as requireOwnedProject, for a task and its parent project. */
export async function requireOwnedTask(taskId: string) {
  const [userId, owned] = await Promise.all([
    requireUserId(),
    getTaskWithProject(taskId),
  ]);

  if (!userId) return UNAUTHENTICATED;
  if (!owned || owned.project.userId !== userId) {
    return {
      response: NextResponse.json(
        { error: "Tarea no encontrada" },
        { status: 404 },
      ),
    } as const;
  }
  return { userId, task: owned.task, project: owned.project } as const;
}
