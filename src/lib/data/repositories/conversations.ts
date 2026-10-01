import { and, desc, eq, sql } from "drizzle-orm";
import type { PendingAction } from "@/lib/ai/agent";
import type { HistoryStep, Provider } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { assistantConversations, type TranscriptItem } from "@/lib/db/schema";
import { isUuid } from "@/lib/uuid";

/** Conversations shown in the list; older ones are kept but not listed. */
export const LIST_LIMIT = 100;

const summaryFields = {
  id: assistantConversations.id,
  title: assistantConversations.title,
  provider: assistantConversations.provider,
  updatedAt: assistantConversations.updatedAt,
};

export type ConversationSummary = {
  id: string;
  title: string;
  provider: Provider;
  updatedAt: Date;
};

export type Conversation = ConversationSummary & {
  history: HistoryStep[];
  transcript: TranscriptItem[];
  pending: PendingAction | null;
  version: number;
};

const ownedBy = (userId: string, id: string) =>
  and(
    eq(assistantConversations.id, id),
    eq(assistantConversations.userId, userId),
  );

/** Most recent first, without the (possibly large) history or transcript. */
export async function listConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  const rows = await db
    .select(summaryFields)
    .from(assistantConversations)
    .where(eq(assistantConversations.userId, userId))
    .orderBy(desc(assistantConversations.updatedAt))
    .limit(LIST_LIMIT);
  return rows as ConversationSummary[];
}

/** The conversation, only if `id` is a UUID owned by `userId`. */
export async function getOwnedConversation(
  userId: string,
  id: unknown,
): Promise<Conversation | null> {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      ...summaryFields,
      history: assistantConversations.history,
      transcript: assistantConversations.transcript,
      pending: assistantConversations.pending,
      version: assistantConversations.version,
    })
    .from(assistantConversations)
    .where(ownedBy(userId, id))
    .limit(1);
  return (row as Conversation | undefined) ?? null;
}

export type Turn = {
  provider: Provider;
  history: HistoryStep[];
  transcript: TranscriptItem[];
  pending: PendingAction | null;
};

/** Created with its first turn, so a failed first message leaves nothing. */
export async function createConversation(
  userId: string,
  title: string,
  turn: Turn,
): Promise<ConversationSummary> {
  const [row] = await db
    .insert(assistantConversations)
    .values({ userId, title, ...turn })
    .returning(summaryFields);
  return row as ConversationSummary;
}

/**
 * Stores the outcome of a turn, only if nobody saved another turn since
 * `version` was read (e.g. from a second tab). Returns the new summary, or
 * null on that conflict.
 */
export async function saveTurn(
  userId: string,
  id: string,
  version: number,
  turn: Turn,
): Promise<ConversationSummary | null> {
  const [row] = await db
    .update(assistantConversations)
    .set({
      ...turn,
      version: sql`${assistantConversations.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(ownedBy(userId, id), eq(assistantConversations.version, version)),
    )
    .returning(summaryFields);
  return (row as ConversationSummary | undefined) ?? null;
}

export async function renameConversation(
  userId: string,
  id: unknown,
  title: string,
): Promise<ConversationSummary | null> {
  if (!isUuid(id)) return null;
  const [row] = await db
    .update(assistantConversations)
    .set({ title })
    .where(ownedBy(userId, id))
    .returning(summaryFields);
  return (row as ConversationSummary | undefined) ?? null;
}

/** True if the conversation existed and belonged to the user. */
export async function deleteConversation(
  userId: string,
  id: unknown,
): Promise<boolean> {
  if (!isUuid(id)) return false;
  const deleted = await db
    .delete(assistantConversations)
    .where(ownedBy(userId, id))
    .returning({ id: assistantConversations.id });
  return deleted.length > 0;
}
