import { auth } from "@/auth";

/**
 * Guard used by every projects/tasks/comments route handler.
 * Returns the authenticated user's id, or null if there is no valid session.
 */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
