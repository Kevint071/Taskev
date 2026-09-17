import assert from "node:assert/strict";
import { test } from "node:test";
import { clampProgress, parseProgressInput, stepProgress } from "./progress";

test("clampProgress keeps values within 0–100 and rounds", () => {
  assert.equal(clampProgress(-5), 0);
  assert.equal(clampProgress(150), 100);
  assert.equal(clampProgress(44.5), 45);
  assert.equal(clampProgress(44.4), 44);
});

test("stepProgress moves by 10 without crossing the limits", () => {
  assert.equal(stepProgress(40, 1), 50);
  assert.equal(stepProgress(40, -1), 30);
  assert.equal(stepProgress(95, 1), 100);
  assert.equal(stepProgress(100, 1), 100);
  assert.equal(stepProgress(5, -1), 0);
  assert.equal(stepProgress(0, -1), 0);
});

test("parseProgressInput rounds and clamps typed numbers", () => {
  assert.equal(parseProgressInput("45"), 45);
  assert.equal(parseProgressInput(" 72.6 "), 73);
  assert.equal(parseProgressInput("12,4"), 12);
  assert.equal(parseProgressInput("250"), 100);
  assert.equal(parseProgressInput("-3"), 0);
});

test("parseProgressInput returns null for empty or non-numeric input", () => {
  assert.equal(parseProgressInput(""), null);
  assert.equal(parseProgressInput("   "), null);
  assert.equal(parseProgressInput("abc"), null);
  assert.equal(parseProgressInput("4x"), null);
});
