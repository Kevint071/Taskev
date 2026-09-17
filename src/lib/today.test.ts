import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTodayMetrics, buildTodaySections, type TodayTask } from "./today";

// Local noon on 2026-09-16, so the calendar day is unambiguous in any zone.
const now = new Date(2026, 8, 16, 12, 0, 0);

function task(
  id: string,
  opts: { due?: string; relevance?: number; status?: string } = {},
): TodayTask {
  return {
    id,
    status: opts.status ?? "disponible",
    dueDate: opts.due ? new Date(`${opts.due}T00:00:00Z`) : null,
    relevance: opts.relevance ?? 0,
  };
}

function utcDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

test("empty list has no top tasks and empty sections", () => {
  const result = buildTodaySections([], now);
  assert.deepEqual(result.top, []);
  assert.deepEqual(result.overdue, []);
  assert.deepEqual(result.dueToday, []);
  assert.deepEqual(result.thisWeek, []);
});

test("top holds open tasks ordered by relevance, highest first", () => {
  const result = buildTodaySections(
    [
      task("a", { relevance: 10 }),
      task("b", { relevance: 90 }),
      task("c", { relevance: 40 }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["b", "c", "a"],
  );
});

test("top is capped at 3 tasks by default", () => {
  const result = buildTodaySections(
    [
      task("a", { relevance: 10 }),
      task("b", { relevance: 90 }),
      task("c", { relevance: 40 }),
      task("d", { relevance: 70 }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["b", "d", "c"],
  );
});

test("overdue, due-today and this-week each hold their own tasks", () => {
  const result = buildTodaySections(
    [
      task("next", { relevance: 100 }),
      task("yesterday", { due: "2026-09-15", relevance: 5 }),
      task("today", { due: "2026-09-16", relevance: 5 }),
      task("in7", { due: "2026-09-23", relevance: 5 }),
      task("in8", { due: "2026-09-24", relevance: 5 }),
      task("nodue", { relevance: 5 }),
    ],
    now,
  );
  assert.deepEqual(
    result.overdue.map((t) => t.id),
    ["yesterday"],
  );
  assert.deepEqual(
    result.dueToday.map((t) => t.id),
    ["today"],
  );
  assert.deepEqual(
    result.thisWeek.map((t) => t.id),
    ["in7"],
  );
});

test("top tasks also appear in overdue/this week when they qualify", () => {
  const result = buildTodaySections(
    [
      task("urgent", { due: "2026-09-10", relevance: 100 }),
      task("other", { due: "2026-09-12", relevance: 50 }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["urgent", "other"],
  );
  assert.deepEqual(
    result.overdue.map((t) => t.id),
    ["urgent", "other"],
  );
});

test("completed tasks are ignored everywhere", () => {
  const result = buildTodaySections(
    [
      task("done", { due: "2026-09-10", relevance: 999, status: "completada" }),
      task("done2", { due: "2026-09-16", status: "completada" }),
    ],
    now,
  );
  assert.deepEqual(result.top, []);
  assert.deepEqual(result.overdue, []);
  assert.deepEqual(result.dueToday, []);
  assert.deepEqual(result.thisWeek, []);
});

test("sections are sorted by due date", () => {
  const result = buildTodaySections(
    [
      task("next", { relevance: 100 }),
      task("late", { due: "2026-09-20" }),
      task("early", { due: "2026-09-17" }),
    ],
    now,
  );
  assert.deepEqual(
    result.thisWeek.map((t) => t.id),
    ["early", "late"],
  );
});

test("buildTodayMetrics: counts completions today and this week", () => {
  const metrics = buildTodayMetrics(
    [utcDay("2026-09-16"), utcDay("2026-09-15"), utcDay("2026-09-01"), null],
    now,
  );

  assert.equal(metrics.completedToday, 1);
  assert.equal(metrics.completedThisWeek, 2);
});

test("buildTodayMetrics: streak counts consecutive days ending today", () => {
  const metrics = buildTodayMetrics(
    [
      utcDay("2026-09-16"),
      utcDay("2026-09-15"),
      utcDay("2026-09-14"),
      utcDay("2026-09-12"),
    ],
    now,
  );

  assert.equal(metrics.streak, 3);
});

test("buildTodayMetrics: streak gives today a grace day when nothing is done yet", () => {
  const metrics = buildTodayMetrics(
    [utcDay("2026-09-15"), utcDay("2026-09-14")],
    now,
  );

  assert.equal(metrics.streak, 2);
});

test("buildTodayMetrics: streak is zero once a day is skipped", () => {
  const metrics = buildTodayMetrics([utcDay("2026-09-13")], now);

  assert.equal(metrics.streak, 0);
});
