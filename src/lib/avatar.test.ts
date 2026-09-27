import assert from "node:assert/strict";
import { test } from "node:test";
import { getAvatarColor, getInitials } from "./avatar";

test("getInitials uses the first and last word of a name", () => {
  assert.equal(getInitials("Kevin Torrecilla"), "KT");
  assert.equal(getInitials("  ana  maría   lópez "), "AL");
});

test("getInitials falls back to the first two characters", () => {
  assert.equal(getInitials("kevin@example.com"), "KE");
  assert.equal(getInitials(" Ana "), "AN");
});

test("getAvatarColor is stable and ignores case and accents", () => {
  assert.equal(getAvatarColor("José"), getAvatarColor("jose"));
  assert.match(getAvatarColor("kevin"), /^hsl\(\d+ 58% 42%\)$/);
});
