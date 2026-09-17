import { eq } from "drizzle-orm";
import { auth } from "@/auth";
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
