import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { decryptApiKey, encryptApiKey } from "./crypto";
import { PROVIDERS, type Provider } from "./provider";

const FIELDS = {
  gemini: "geminiApiKeyEncrypted",
  groq: "groqApiKeyEncrypted",
  openrouter: "openrouterApiKeyEncrypted",
} as const satisfies Record<Provider, keyof typeof users.$inferSelect>;

/**
 * A value that no longer decrypts (lost or rotated secret) counts as "not
 * configured", so the user is asked to enter it again instead of hitting a 500.
 */
function decrypt(
  encrypted: string | null,
  userId: string,
  provider: Provider,
): string | null {
  if (!encrypted) return null;
  try {
    return decryptApiKey(encrypted, userId);
  } catch (error) {
    console.warn("Stored API key could not be decrypted", {
      userId,
      provider,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

/** The user's keys in the clear, for server-side use only. */
export async function getStoredKeys(
  userId: string,
): Promise<Record<Provider, string | null>> {
  const [row] = await db
    .select({
      gemini: users.geminiApiKeyEncrypted,
      groq: users.groqApiKeyEncrypted,
      openrouter: users.openrouterApiKeyEncrypted,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return {
    gemini: decrypt(row?.gemini ?? null, userId, "gemini"),
    groq: decrypt(row?.groq ?? null, userId, "groq"),
    openrouter: decrypt(row?.openrouter ?? null, userId, "openrouter"),
  };
}

export async function getStoredKey(
  userId: string,
  provider: Provider,
): Promise<string | null> {
  return (await getStoredKeys(userId))[provider];
}

/** Providers the user can talk to, in the order they're offered. */
export function configuredProviders(
  keys: Record<Provider, string | null>,
): Provider[] {
  return PROVIDERS.filter((provider) => keys[provider] !== null);
}

export async function saveKey(
  userId: string,
  provider: Provider,
  apiKey: string,
) {
  await db
    .update(users)
    .set({ [FIELDS[provider]]: encryptApiKey(apiKey, userId) })
    .where(eq(users.id, userId));
}

export async function clearKey(userId: string, provider: Provider) {
  await db
    .update(users)
    .set({ [FIELDS[provider]]: null })
    .where(eq(users.id, userId));
}
