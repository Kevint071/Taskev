import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { requireEnv } from "../env";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

/**
 * Read at call time, not import time, so `next build` works without it.
 * Losing or rotating it makes every stored key unreadable.
 */
function encryptionKey(): Buffer {
  const key = Buffer.from(requireEnv("AI_KEY_ENCRYPTION_SECRET"), "base64");
  if (key.length !== 32) {
    throw new Error("AI_KEY_ENCRYPTION_SECRET must be 32 bytes in base64");
  }
  return key;
}

/**
 * Encrypts a user's API key as `v1:<iv>:<tag>:<ciphertext>` (base64 parts).
 * The user id is bound as AAD, so a value copied to another row won't decrypt.
 */
export function encryptApiKey(plaintext: string, userId: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  cipher.setAAD(Buffer.from(userId, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/** Throws on an unknown format, a wrong user, a wrong secret or tampering. */
export function decryptApiKey(stored: string, userId: string): string {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unsupported encrypted key format");
  }
  const [, iv, tag, ciphertext] = parts.map((part) =>
    Buffer.from(part, "base64"),
  );
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAAD(Buffer.from(userId, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** The only part of a key ever sent back to the browser. */
export function maskKey(key: string): string {
  return key.slice(-4);
}
