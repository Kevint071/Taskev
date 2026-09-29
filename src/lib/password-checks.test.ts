import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isStrongPassword,
  passwordChecks,
  passwordRules,
} from "./password-checks";

function passed(input: Parameters<typeof passwordChecks>[0]) {
  return passwordChecks(input)
    .filter((check) => check.ok)
    .map((check) => check.id);
}

function rulesMet(password: string) {
  return passwordRules(password)
    .filter((rule) => rule.ok)
    .map((rule) => rule.id);
}

test("passwordRules starts with nothing met", () => {
  assert.deepEqual(rulesMet(""), []);
});

test("passwordRules checks each requirement on its own", () => {
  assert.deepEqual(rulesMet("abcdefghij"), ["length", "letter"]);
  assert.deepEqual(rulesMet("1234567890"), ["length", "number"]);
  assert.deepEqual(rulesMet("!!!!!!!!!!"), ["length", "special"]);
  assert.deepEqual(rulesMet("a1!"), ["letter", "number", "special"]);
});

test("passwordRules counts accented letters but not spaces as special", () => {
  assert.deepEqual(rulesMet("ñ"), ["letter"]);
  assert.deepEqual(rulesMet("a b"), ["letter"]);
});

test("isStrongPassword needs every rule", () => {
  assert.equal(isStrongPassword("abcdefg1!"), false); // 9 characters
  assert.equal(isStrongPassword("abcdefgh1!"), true);
  assert.equal(isStrongPassword("abcdefghi!"), false); // no number
  assert.equal(isStrongPassword("abcdefghi1"), false); // no special
  assert.equal(isStrongPassword("1234567890!"), false); // no letter
});

test("passwordChecks starts with nothing met", () => {
  assert.deepEqual(passed({ current: "", next: "", confirm: "" }), []);
});

test("passwordChecks lists the rules first, then different and match", () => {
  assert.deepEqual(
    passwordChecks({ current: "", next: "", confirm: "" }).map((c) => c.id),
    ["length", "letter", "number", "special", "different", "match"],
  );
});

test("passwordChecks rejects reusing the current password", () => {
  assert.deepEqual(
    passed({
      current: "same-pass-1",
      next: "same-pass-1",
      confirm: "same-pass-1",
    }),
    ["length", "letter", "number", "special", "match"],
  );
});

test("passwordChecks passes a valid, confirmed new password", () => {
  assert.deepEqual(
    passed({
      current: "old-pass",
      next: "new-pass-1!",
      confirm: "new-pass-1!",
    }),
    ["length", "letter", "number", "special", "different", "match"],
  );
});
