import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { beforeEach, test } from "node:test";
import { decryptApiKey, encryptApiKey, maskKey } from "./crypto";

const SECRET_VAR = "AI_KEY_ENCRYPTION_SECRET";
const USER = "7f3c2a9e-1b4d-4c6e-8a0f-2d5e9b1c3a7f";
const OTHER_USER = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const KEY = "AIzaSyD-example-gemini-key-1234";

beforeEach(() => {
  process.env[SECRET_VAR] = randomBytes(32).toString("base64");
});

test("round-trips a key", () => {
  const stored = encryptApiKey(KEY, USER);
  assert.match(stored, /^v1:[^:]+:[^:]+:[^:]+$/);
  assert.equal(decryptApiKey(stored, USER), KEY);
});

test("never stores the key in the clear", () => {
  assert.ok(!encryptApiKey(KEY, USER).includes(KEY));
});

test("encrypting the same key twice gives different ciphertexts", () => {
  assert.notEqual(encryptApiKey(KEY, USER), encryptApiKey(KEY, USER));
});

test("a ciphertext copied to another user does not decrypt", () => {
  const stored = encryptApiKey(KEY, USER);
  assert.throws(() => decryptApiKey(stored, OTHER_USER));
});

test("a tampered ciphertext does not decrypt", () => {
  const [version, iv, tag, ct] = encryptApiKey(KEY, USER).split(":");
  const bytes = Buffer.from(ct, "base64");
  bytes[0] ^= 0xff;
  const tampered = [version, iv, tag, bytes.toString("base64")].join(":");
  assert.throws(() => decryptApiKey(tampered, USER));
});

test("an unknown format does not decrypt", () => {
  assert.throws(() => decryptApiKey("v2:a:b:c", USER));
  assert.throws(() => decryptApiKey(KEY, USER));
});

test("a missing secret throws", () => {
  delete process.env[SECRET_VAR];
  assert.throws(() => encryptApiKey(KEY, USER), /AI_KEY_ENCRYPTION_SECRET/);
});

test("a secret of the wrong length throws", () => {
  process.env[SECRET_VAR] = randomBytes(16).toString("base64");
  assert.throws(() => encryptApiKey(KEY, USER), /32 bytes/);
});

test("a key encrypted under another secret does not decrypt", () => {
  const stored = encryptApiKey(KEY, USER);
  process.env[SECRET_VAR] = randomBytes(32).toString("base64");
  assert.throws(() => decryptApiKey(stored, USER));
});

test("maskKey keeps only the last 4 characters", () => {
  assert.equal(maskKey(KEY), "1234");
  assert.equal(maskKey("abc"), "abc");
});
