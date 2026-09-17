import assert from "node:assert/strict";
import { test } from "node:test";
import { computeRelevance, computeUrgency } from "./relevance";

const NOW = new Date("2026-01-15T00:00:00Z");
const day = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

test("computeUrgency: no due date is zero", () => {
  assert.equal(computeUrgency(null, NOW), 0);
});

test("computeUrgency: overdue date is at (or near) the maximum", () => {
  const u = computeUrgency(day(-5), NOW);
  assert.ok(u >= 99);
});

test("computeUrgency: far-future date decays toward a low value", () => {
  const near = computeUrgency(day(1), NOW);
  const far = computeUrgency(day(365), NOW);
  assert.ok(far < near);
  assert.ok(far < 1);
});

test("computeUrgency: closer due date always scores higher than a farther one", () => {
  const closer = computeUrgency(day(2), NOW);
  const farther = computeUrgency(day(20), NOW);
  assert.ok(closer > farther);
});

test("computeRelevance: near due date beats a similar priority without a due date", () => {
  const withDueDate = computeRelevance(1, day(1), NOW);
  const withoutDueDate = computeRelevance(1, null, NOW);
  assert.ok(withDueDate > withoutDueDate);
});

test("computeRelevance: no due date depends only on priority relative to others", () => {
  const higherPriority = computeRelevance(3, null, NOW);
  const lowerPriority = computeRelevance(1, null, NOW);
  assert.ok(higherPriority > lowerPriority);
});

test("computeRelevance: high enough priority without a due date can outrank an urgent one", () => {
  const highPriorityNoDate = computeRelevance(10, null, NOW);
  const lowPriorityUrgent = computeRelevance(1, day(1), NOW);
  assert.ok(highPriorityNoDate > lowPriorityUrgent);
});

test("computeRelevance: more progress outranks less progress at equal priority and due date", () => {
  const almostDone = computeRelevance(1, day(5), NOW, 90);
  const barelyStarted = computeRelevance(1, day(5), NOW, 10);
  assert.ok(almostDone > barelyStarted);
});

test("computeRelevance: progress defaults to zero when omitted", () => {
  const withoutProgress = computeRelevance(1, day(5), NOW);
  const withZeroProgress = computeRelevance(1, day(5), NOW, 0);
  assert.equal(withoutProgress, withZeroProgress);
});
