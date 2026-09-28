import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { decryptApiKey, encryptApiKey } from "./crypto";

/**
 * The user's Gemini key in the clear, for server-side use only. A value that
 * no longer decrypts (lost or rotated secret) counts as "not configured", so
 * the user is asked to enter it again instead of hitting a 500.
 */
export async function getStoredGeminiKey(
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ encrypted: users.geminiApiKeyEncrypted })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row?.encrypted) return null;
  try {
    return decryptApiKey(row.encrypted, userId);
  } catch (error) {
    console.warn("Stored Gemini key could not be decrypted", {
      userId,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export async function saveGeminiKey(userId: string, apiKey: string) {
  await db
    .update(users)
    .set({ geminiApiKeyEncrypted: encryptApiKey(apiKey, userId) })
    .where(eq(users.id, userId));
}

export async function clearGeminiKey(userId: string) {
  await db
    .update(users)
    .set({ geminiApiKeyEncrypted: null })
    .where(eq(users.id, userId));
}
