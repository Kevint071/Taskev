import assert from "node:assert/strict";
import { test } from "node:test";
import { passwordChecks } from "./password-checks";

function passed(input: Parameters<typeof passwordChecks>[0]) {
  return passwordChecks(input)
    .filter((check) => check.ok)
    .map((check) => check.id);
}

test("passwordChecks starts with nothing met", () => {
  assert.deepEqual(passed({ current: "", next: "", confirm: "" }), []);
});

test("passwordChecks requires the minimum length", () => {
  assert.deepEqual(passed({ current: "old", next: "short", confirm: "" }), [
    "different",
  ]);
});

test("passwordChecks rejects reusing the current password", () => {
  assert.deepEqual(
    passed({ current: "same-pass", next: "same-pass", confirm: "same-pass" }),
    ["length", "match"],
  );
});

test("passwordChecks passes a valid, confirmed new password", () => {
  assert.deepEqual(
    passed({ current: "old-pass", next: "new-pass!", confirm: "new-pass!" }),
    ["length", "different", "match"],
  );
});
