import { db } from "@/lib/db";
import { taskComments } from "@/lib/db/schema";

export type Comment = typeof taskComments.$inferSelect;
export type NewComment = typeof taskComments.$inferInsert;

export async function insertComment(values: NewComment): Promise<Comment> {
  const [created] = await db.insert(taskComments).values(values).returning();
  return created;
}
