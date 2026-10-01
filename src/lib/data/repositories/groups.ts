import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type GroupChanges = Partial<NewGroup>;

export async function insertGroup(values: NewGroup): Promise<Group> {
  const [created] = await db.insert(groups).values(values).returning();
  return created;
}

export async function updateGroupById(
  groupId: string,
  changes: GroupChanges,
): Promise<Group> {
  const [updated] = await db
    .update(groups)
    .set(changes)
    .where(eq(groups.id, groupId))
    .returning();
  return updated;
}

export async function deleteGroupById(groupId: string): Promise<void> {
  await db.delete(groups).where(eq(groups.id, groupId));
}
