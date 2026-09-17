import assert from "node:assert/strict";
import { test } from "node:test";
import {
  blockedFromDisponible,
  canCompleteAtProgress,
  clampProgress,
  parseProgressInput,
  stepProgress,
} from "./progress";

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

test("canCompleteAtProgress only allows completion at 100%", () => {
  assert.equal(canCompleteAtProgress(100), true);
  assert.equal(canCompleteAtProgress(99), false);
  assert.equal(canCompleteAtProgress(0), false);
});

test("blockedFromDisponible allows a task with no progress and no completion date", () => {
  assert.equal(blockedFromDisponible(0, null), null);
});

test("blockedFromDisponible blocks on leftover progress, even with a completion date set", () => {
  assert.equal(blockedFromDisponible(40, "2026-01-01T00:00:00Z"), "progress");
});

test("blockedFromDisponible blocks on a leftover completion date once progress is already 0", () => {
  assert.equal(blockedFromDisponible(0, "2026-01-01T00:00:00Z"), "completedAt");
});
