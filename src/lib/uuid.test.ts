import assert from "node:assert/strict";
import { test } from "node:test";
import { isUuid } from "./uuid";

test("accepts canonical UUIDs in either case", () => {
  assert.equal(isUuid("4f11b7ce-0b36-4761-bdff-3a46f85de9d5"), true);
  assert.equal(isUuid("4F11B7CE-0B36-4761-BDFF-3A46F85DE9D5"), true);
  assert.equal(isUuid("00000000-0000-0000-0000-000000000000"), true);
});

test("rejects ids a model might invent", () => {
  assert.equal(isUuid("123"), false);
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(isUuid(""), false);
  assert.equal(isUuid("Enviar factura"), false);
  assert.equal(isUuid("4f11b7ce0b364761bdff3a46f85de9d5"), false);
  assert.equal(isUuid("{4f11b7ce-0b36-4761-bdff-3a46f85de9d5}"), false);
  assert.equal(isUuid(" 4f11b7ce-0b36-4761-bdff-3a46f85de9d5"), false);
  assert.equal(isUuid("4f11b7ce-0b36-4761-bdff-3a46f85de9d5x"), false);
  assert.equal(isUuid("gggggggg-0b36-4761-bdff-3a46f85de9d5"), false);
});

test("rejects non-strings", () => {
  assert.equal(isUuid(undefined), false);
  assert.equal(isUuid(null), false);
  assert.equal(isUuid(42), false);
});
