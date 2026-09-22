import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareByRelevance,
  compareForProjectOrder,
  computeRelevance,
  computeUrgency,
  isActionable,
  positionRank,
} from "./relevance";

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

test("computeRelevance: score is priority weight plus urgency, nothing else", () => {
  assert.equal(
    computeRelevance(2, day(5), NOW),
    2 * 20 + computeUrgency(day(5), NOW),
  );
});

test("compareByRelevance: higher relevance goes first, whatever the progress", () => {
  const hot = { relevance: 90, progressPct: 0 };
  const cold = { relevance: 40, progressPct: 100 };
  assert.ok(compareByRelevance(hot, cold) < 0);
  assert.ok(compareByRelevance(cold, hot) > 0);
});

test("compareByRelevance: equal relevance is broken by more progress first", () => {
  const started = { relevance: 60, progressPct: 70 };
  const untouched = { relevance: 60, progressPct: 10 };
  assert.ok(compareByRelevance(started, untouched) < 0);
  assert.ok(compareByRelevance(untouched, started) > 0);
});

test("compareByRelevance: equal relevance and progress is a tie", () => {
  const a = { relevance: 60, progressPct: 30 };
  assert.equal(compareByRelevance(a, { ...a }), 0);
});

test("compareByRelevance: a missing relevance counts as zero", () => {
  const scored = { relevance: 1, progressPct: 0 };
  const unscored = { relevance: null, progressPct: 0 };
  assert.ok(compareByRelevance(scored, unscored) < 0);
});

test("compareByRelevance: equal relevance is broken by position before progress", () => {
  const draggedUp = { relevance: 60, progressPct: 0, positionRank: 0 };
  const draggedDown = { relevance: 60, progressPct: 100, positionRank: 1 };
  assert.ok(compareByRelevance(draggedUp, draggedDown) < 0);
  assert.ok(compareByRelevance(draggedDown, draggedUp) > 0);
});

test("compareByRelevance: relevance still outranks position", () => {
  const higherRelevance = { relevance: 90, progressPct: 0, positionRank: 1 };
  const higherPosition = { relevance: 40, progressPct: 0, positionRank: 0 };
  assert.ok(compareByRelevance(higherRelevance, higherPosition) < 0);
});

test("compareByRelevance: a missing position counts as last", () => {
  const ranked = { relevance: 60, progressPct: 0, positionRank: 0 };
  const unranked = { relevance: 60, progressPct: 0 };
  assert.ok(compareByRelevance(ranked, unranked) < 0);
});

test("positionRank: first of many is 0, last is 1", () => {
  assert.equal(positionRank(0, 4), 0);
  assert.equal(positionRank(3, 4), 1);
  assert.equal(positionRank(1, 4), 1 / 3);
});

test("positionRank: a single task, or none, ranks as 0", () => {
  assert.equal(positionRank(0, 1), 0);
  assert.equal(positionRank(0, 0), 0);
});

test("compareByRelevance: sorting a list applies both rules in order", () => {
  const list = [
    { id: "low-progress-tie", relevance: 60, progressPct: 10 },
    { id: "top", relevance: 90, progressPct: 0 },
    { id: "high-progress-tie", relevance: 60, progressPct: 80 },
  ];
  assert.deepEqual(
    list.sort(compareByRelevance).map((t) => t.id),
    ["top", "high-progress-tie", "low-progress-tie"],
  );
});

test("isActionable: blocked and paused tasks are not, the rest are", () => {
  assert.equal(isActionable("bloqueada"), false);
  assert.equal(isActionable("pausada"), false);
  assert.equal(isActionable("disponible"), true);
  assert.equal(isActionable("en_curso"), true);
});

test("compareForProjectOrder: workable tasks go before blocked or paused ones, even with lower relevance", () => {
  const list = [
    { id: "blocked-hot", status: "bloqueada", relevance: 120, progressPct: 0 },
    { id: "paused-warm", status: "pausada", relevance: 80, progressPct: 50 },
    {
      id: "workable-cold",
      status: "disponible",
      relevance: 20,
      progressPct: 0,
    },
    { id: "workable-hot", status: "en_curso", relevance: 90, progressPct: 0 },
  ];
  assert.deepEqual(
    list.sort(compareForProjectOrder).map((t) => t.id),
    ["workable-hot", "workable-cold", "blocked-hot", "paused-warm"],
  );
});
