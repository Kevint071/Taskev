import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGroupById, getTaskWithGroup } from "@/lib/data/access";
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
 * Guard used by every groups/tasks/comments route handler.
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
 * Fetches the current user and the target group concurrently instead of
 * sequentially, since the group lookup doesn't actually need the user id
 * until the ownership check below — each is a separate network round trip
 * to the DB, so running them in parallel halves that part of the latency.
 */
export async function requireOwnedGroup(groupId: string) {
  const [userId, group] = await Promise.all([
    requireUserId(),
    getGroupById(groupId),
  ]);

  if (!userId) return UNAUTHENTICATED;
  if (!group || group.userId !== userId) {
    return {
      response: NextResponse.json(
        { error: "Grupo no encontrado" },
        { status: 404 },
      ),
    } as const;
  }
  return { userId, group } as const;
}

/** Same idea as requireOwnedGroup, for a task and its parent group. */
export async function requireOwnedTask(taskId: string) {
  const [userId, owned] = await Promise.all([
    requireUserId(),
    getTaskWithGroup(taskId),
  ]);

  if (!userId) return UNAUTHENTICATED;
  if (!owned || owned.group.userId !== userId) {
    return {
      response: NextResponse.json(
        { error: "Tarea no encontrada" },
        { status: 404 },
      ),
    } as const;
  }
  return { userId, task: owned.task, group: owned.group } as const;
}
